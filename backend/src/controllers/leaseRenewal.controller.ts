// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';
import appCache from '../utils/cache';

/**
 * Submit a lease renewal request
 */
export const requestLeaseRenewal = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const { bookingId, proposedDurationMonths, proposedStartDate, proposedRent, tenantNotes } = req.body;

    if (!bookingId || !proposedStartDate) {
      res.status(400).json({ message: 'Booking ID and proposed start date are required' });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (booking.tenantId !== tenantId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const renewal = await prisma.leaseRenewalRequest.create({
      data: {
        tenantId,
        propertyId: booking.propertyId,
        bookingId,
        proposedDurationMonths: parseInt(proposedDurationMonths || '12', 10),
        proposedStartDate: new Date(proposedStartDate),
        proposedRent: proposedRent ? parseFloat(proposedRent) : null,
        tenantNotes: tenantNotes || null,
        status: 'PENDING'
      },
      include: {
        property: { select: { id: true, title: true, location: true, landlordId: true } }
      }
    });

    await prisma.notification.create({
      data: {
        userId: booking.property.landlordId,
        type: 'ANNOUNCEMENT',
        title: '📑 New Lease Renewal Request',
        message: `Tenant submitted a ${renewal.proposedDurationMonths}-month renewal request for "${booking.property.title}".`,
        link: '/dashboard/landlord'
      }
    }).catch(() => null);

    try {
      getIO().to(booking.property.landlordId).emit('lease_renewal_requested', renewal);
    } catch (e) { /* non-blocking */ }

    res.status(201).json({
      message: 'Lease renewal application submitted to your landlord',
      renewal
    });
  } catch (error) {
    console.error('Error requesting lease renewal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get tenant's renewal requests
 */
export const getTenantRenewals = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const renewals = await prisma.leaseRenewalRequest.findMany({
      where: { tenantId },
      include: {
        property: { select: { id: true, title: true, location: true } },
        booking: { select: { id: true, startDate: true, endDate: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ renewals });
  } catch (error) {
    console.error('Error fetching renewal requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get landlord's incoming lease renewal requests
 */
export const getLandlordRenewals = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const staffAssignments = await prisma.propertyStaff.findMany({
      where: { userId: landlordId },
      select: { propertyId: true }
    });
    const staffPropertyIds = staffAssignments.map(s => s.propertyId);

    const renewals = await prisma.leaseRenewalRequest.findMany({
      where: {
        OR: [
          { property: { landlordId } },
          ...(staffPropertyIds.length > 0 ? [{ propertyId: { in: staffPropertyIds } }] : [])
        ]
      },
      include: {
        property: { select: { id: true, title: true, location: true } },
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        booking: { select: { id: true, startDate: true, endDate: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ renewals });
  } catch (error) {
    console.error('Error fetching landlord renewal requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Respond to a lease renewal request (Landlord: ACCEPTED, DECLINED, NEGOTIATING)
 */
export const respondLeaseRenewal = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { id } = req.params;
    const { status, landlordResponse } = req.body;

    const validStatuses = ['ACCEPTED', 'DECLINED', 'NEGOTIATING'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const renewal = await prisma.leaseRenewalRequest.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!renewal) {
      res.status(404).json({ message: 'Lease renewal request not found' });
      return;
    }

    const isStaff = await prisma.propertyStaff.findFirst({
      where: { propertyId: renewal.propertyId, userId: landlordId }
    });

    if (renewal.property.landlordId !== landlordId && req.user?.role !== 'ADMIN' && !isStaff) {
      res.status(403).json({ message: 'Forbidden: You do not have permission to manage lease renewals for this property' });
      return;
    }

    const updated = await prisma.leaseRenewalRequest.update({
      where: { id },
      data: {
        status,
        landlordResponse: landlordResponse || null,
        respondedAt: new Date()
      },
      include: {
        property: { select: { id: true, title: true, location: true } }
      }
    });

    await prisma.notification.create({
      data: {
        userId: renewal.tenantId,
        type: 'ANNOUNCEMENT',
        title: status === 'ACCEPTED' ? '🎉 Lease Renewal Approved!' : status === 'DECLINED' ? 'Lease Renewal Declined' : 'Lease Renewal Status Updated',
        message: `Your lease renewal request was marked as ${status} for "${updated.property.title}".`,
        link: '/dashboard/tenant'
      }
    }).catch(() => null);

    // Notify landlord if staff member responded
    if (isStaff && renewal.property.landlordId !== landlordId) {
      await prisma.notification.create({
        data: {
          userId: renewal.property.landlordId,
          type: 'ANNOUNCEMENT',
          title: `📑 Staff Responded to Lease Renewal`,
          message: `Your property staff marked the renewal request for "${updated.property.title}" as ${status}.`,
          link: '/dashboard/landlord'
        }
      }).catch(() => null);
    }

    // If accepted, automatically prolong the underlying booking duration
    if (status === 'ACCEPTED') {
      try {
        const currentBooking = await prisma.booking.findUnique({ where: { id: renewal.bookingId } });
        if (currentBooking) {
          const currentEnd = new Date(currentBooking.endDate);
          const newEnd = new Date(currentEnd);
          newEnd.setMonth(newEnd.getMonth() + (renewal.proposedDurationMonths || 12));
          await prisma.booking.update({
            where: { id: renewal.bookingId },
            data: {
              endDate: newEnd,
              status: 'ACTIVE'
            }
          });
          getIO().to(renewal.tenantId).emit('booking_updated', { bookingId: renewal.bookingId });
          getIO().to(renewal.property.landlordId).emit('booking_updated', { bookingId: renewal.bookingId });
          appCache.flushAll();
        }
      } catch (err) {
        console.error('Error auto-extending booking on lease renewal:', err);
      }
    }

    try {
      getIO().to(renewal.tenantId).emit('lease_renewal_updated', updated);
      getIO().to(renewal.property.landlordId).emit('lease_renewal_updated', updated);
    } catch (e) { /* non-blocking */ }

    res.status(200).json({
      message: `Lease renewal status updated to ${status}`,
      renewal: updated
    });
  } catch (error) {
    console.error('Error responding to lease renewal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
