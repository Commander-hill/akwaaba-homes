// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';

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
