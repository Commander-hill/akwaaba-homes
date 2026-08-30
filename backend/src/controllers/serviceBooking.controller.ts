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

    try {
      getIO().to(tenantId).emit('service_booking_created', booking);
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

    const booking = await prisma.serviceBooking.findUnique({ where: { id } });
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

    res.status(200).json({ message: 'Service booking cancelled', booking: updated });
  } catch (error) {
    console.error('Error cancelling service booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
