// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';

/**
 * Submit or Update Move-In / Move-Out Inspection Checklist
 */
export const createOrUpdateInspection = async (req: Request, res: Response): Promise<void> => {
  try {
    const inspectorId = req.user?.id;
    const { bookingId, type, items, notes, photos, cautionDepositDeduction, deductionReason } = req.body;

    if (!bookingId || !type || !items) {
      res.status(400).json({ message: 'Booking ID, inspection type, and checklist items are required' });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: true,
        tenant: true
      }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (booking.property.landlordId !== inspectorId && booking.tenantId !== inspectorId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You are not authorized for this inspection' });
      return;
    }

    const existing = await prisma.inspectionChecklist.findFirst({
      where: {
        bookingId,
        type
      }
    });

    let inspection;
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);
    const photosJson = photos ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : null;

    if (existing) {
      inspection = await prisma.inspectionChecklist.update({
        where: { id: existing.id },
        data: {
          items: itemsJson,
          notes: notes || null,
          photos: photosJson,
          cautionDepositDeduction: parseFloat(cautionDepositDeduction || '0'),
          deductionReason: deductionReason || null,
          signedAt: new Date()
        }
      });
    } else {
      inspection = await prisma.inspectionChecklist.create({
        data: {
          bookingId,
          propertyId: booking.propertyId,
          type,
          inspectorId,
          items: itemsJson,
          notes: notes || null,
          photos: photosJson,
          cautionDepositDeduction: parseFloat(cautionDepositDeduction || '0'),
          deductionReason: deductionReason || null,
          status: 'COMPLETED',
          signedAt: new Date()
        }
      });
    }

    try {
      getIO().to(booking.tenantId).emit('notification', {
        title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Completed`,
        message: `Inspection report for ${booking.property.title} is now available in your dashboard.`,
        type: 'agreement'
      });
      getIO().emit('inspection_updated', { inspectionId: inspection.id, bookingId });
    } catch (e) { /* non-blocking */ }

    res.status(200).json({
      message: 'Inspection checklist recorded successfully',
      inspection
    });
  } catch (error) {
    console.error('Error recording inspection checklist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Inspection Checklists for a Booking
 */
export const getBookingInspections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: true
      }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (booking.tenantId !== userId && booking.property.landlordId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const inspections = await prisma.inspectionChecklist.findMany({
      where: { bookingId },
      include: {
        inspector: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const parsedInspections = inspections.map((ins) => ({
      ...ins,
      items: typeof ins.items === 'string' ? JSON.parse(ins.items) : ins.items,
      photos: ins.photos ? (typeof ins.photos === 'string' ? JSON.parse(ins.photos) : ins.photos) : []
    }));

    res.status(200).json({ inspections: parsedInspections });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
