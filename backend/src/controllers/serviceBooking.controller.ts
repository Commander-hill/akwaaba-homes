// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';

const ESTIMATED_RATES: { [key: string]: number } = {
  AC_SERVICING: 250,
  DEEP_CLEANING: 350,
  PLUMBING: 180,
  ELECTRICAL: 200,
  FUMIGATION: 400,
  WATER_FILTER: 220
};

/**
 * Request an on-demand home service
 */
export const createServiceBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const { propertyId, serviceType, preferredDate, timeSlot, notes } = req.body;

    if (!propertyId || !serviceType || !preferredDate) {
      res.status(400).json({ message: 'Property ID, service type, and preferred date are required' });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (req.user?.role !== 'ADMIN') {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          tenantId,
          propertyId,
          status: { in: ['CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN', 'APPROVED'] }
        }
      });

      if (!activeBooking) {
        res.status(403).json({ message: 'Only residents with an active or confirmed booking can request home services for this property' });
        return;
      }
    }

    const estimatedCost = ESTIMATED_RATES[serviceType] || 200;

    const booking = await prisma.serviceBooking.create({
      data: {
        tenantId,
        propertyId,
        serviceType,
        preferredDate: new Date(preferredDate),
        timeSlot: timeSlot || 'MORNING (8AM - 12PM)',
        estimatedCost,
        notes: notes || null,
        status: 'PENDING'
      },
      include: {
        property: { select: { id: true, title: true, location: true } }
      }
    });

    await prisma.notification.create({
      data: {
        userId: property.landlordId,
        type: 'ANNOUNCEMENT',
        title: '🛠️ New Home Service Request',
        message: `A resident requested ${serviceType.replace('_', ' ')} for ${property.title}.`,
        link: '/dashboard/landlord'
      }
    }).catch(() => {});

    try {
      const io = getIO();
      io.to(tenantId).emit('service_booking_created', booking);
      io.to(property.landlordId).emit('notification', {
        title: '🛠️ New Home Service Request',
        message: `A resident requested ${serviceType.replace('_', ' ')} for ${property.title}.`,
        type: 'service'
      });
    } catch (e) { /* non-blocking */ }

    res.status(201).json({
      message: 'Service appointment booked! A vetted technician will be dispatched.',
      booking
    });
  } catch (error) {
    console.error('Error booking service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get service bookings for a property or portfolio (Landlord / Staff / Admin)
 */
export const getPropertyServiceBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPropertyId = req.params?.propertyId || req.query?.propertyId;
    const propertyId = rawPropertyId ? String(rawPropertyId) : null;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();

    const whereClause: any = {};

    if (propertyId && propertyId !== 'all') {
      const property = await prisma.property.findUnique({ where: { id: propertyId } });
      if (!property) {
        res.status(404).json({ message: 'Property not found' });
        return;
      }

      const isStaff = await prisma.propertyStaff.findFirst({
        where: { propertyId, userId }
      });

      if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      whereClause.propertyId = propertyId;
    } else {
      if (userRole === 'LANDLORD') {
        whereClause.property = { landlordId: userId };
      } else if (userRole === 'CARETAKER') {
        const staffAssignments = await prisma.propertyStaff.findMany({
          where: { userId },
          select: { propertyId: true }
        });
        const staffPropIds = staffAssignments.map(s => s.propertyId);
        if (staffPropIds.length > 0) {
          whereClause.propertyId = { in: staffPropIds };
        } else {
          whereClause.propertyId = '__none__';
        }
      } else if (userRole !== 'ADMIN') {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    const bookings = await prisma.serviceBooking.findMany({
      where: whereClause,
      include: {
        property: { select: { id: true, title: true, location: true } },
        tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true } }
      },
      orderBy: { preferredDate: 'desc' }
    });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching property service bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update service booking status (Landlord / Admin / Staff / Tenant)
 */
export const updateServiceBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, technicianName, technicianPhone, notes } = req.body;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();

    const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!booking) {
      res.status(404).json({ message: 'Service booking not found' });
      return;
    }

    const isLandlord = booking.property.landlordId === userId;
    const isTenant = booking.tenantId === userId;
    const isAdmin = userRole === 'ADMIN';
    const isStaff = await prisma.propertyStaff.findFirst({
      where: { propertyId: booking.propertyId, userId }
    });

    if (!isLandlord && !isAdmin && !isStaff && (!isTenant || status !== 'CANCELLED')) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updateData: any = { status };
    if (technicianName) updateData.technicianName = technicianName;
    if (technicianPhone) updateData.technicianPhone = technicianPhone;
    if (notes) updateData.notes = notes;
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    const updated = await prisma.serviceBooking.update({
      where: { id },
      data: updateData
    });

    // Notify tenant of service status update
    await prisma.notification.create({
      data: {
        userId: booking.tenantId,
        type: 'ANNOUNCEMENT',
        title: `🛠️ Home Service: ${status}`,
        message: `Your ${booking.serviceType.replace('_', ' ')} appointment is now ${status}.${technicianName ? ` Assigned: ${technicianName} (${technicianPhone || 'On-site'})` : ''}`,
        link: '/dashboard/tenant'
      }
    }).catch(() => {});

    try {
      const io = getIO();
      io.to(booking.tenantId).emit('service_booking_updated', updated);
      io.to(booking.tenantId).emit('notification', {
        title: `🛠️ Home Service: ${status}`,
        message: `Your ${booking.serviceType.replace('_', ' ')} appointment is now ${status}.`,
        type: 'service'
      });
    } catch (e) { /* non-blocking */ }

    res.status(200).json({ message: `Service booking marked as ${status}`, booking: updated });
  } catch (error) {
    console.error('Error updating service booking status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get tenant's service bookings
 */
export const getTenantServiceBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const bookings = await prisma.serviceBooking.findMany({
      where: { tenantId },
      include: {
        property: { select: { id: true, title: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching service bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Cancel a service booking
 */
export const cancelServiceBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const { id } = req.params;

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { property: true }
    });
    if (!booking) {
      res.status(404).json({ message: 'Service booking not found' });
      return;
    }

    if (booking.tenantId !== tenantId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updated = await prisma.serviceBooking.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    if (booking.property?.landlordId) {
      await prisma.notification.create({
        data: {
          userId: booking.property.landlordId,
          type: 'ANNOUNCEMENT',
          title: '🛠️ Service Request Cancelled',
          message: `A resident cancelled their ${booking.serviceType.replace('_', ' ')} request for "${booking.property?.title}".`,
          link: '/dashboard/landlord'
        }
      }).catch(() => {});
    }

    try {
      const io = getIO();
      io.emit('service_booking_updated', updated);
      io.to(booking.tenantId).emit('service_booking_updated', updated);
    } catch (e) {}

    res.status(200).json({ message: 'Service booking cancelled', booking: updated });
  } catch (error) {
    console.error('Error cancelling service booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
