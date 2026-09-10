// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';
import { safeJsonParse } from '../utils/json';

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

    const isStaff = await prisma.propertyStaff.findFirst({
      where: {
        propertyId: booking.propertyId,
        userId: inspectorId,
        canCheckInTenants: true
      }
    });

    if (booking.property.landlordId !== inspectorId && booking.tenantId !== inspectorId && req.user?.role !== 'ADMIN' && !isStaff) {
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

    const hasCautionDeduction = type === 'MOVE_OUT' && parseFloat(cautionDepositDeduction || '0') > 0;
    const tenantMsg = hasCautionDeduction
      ? `Move-Out inspection for "${booking.property.title}" assessed caution deduction of GHS ${parseFloat(cautionDepositDeduction).toFixed(2)} (${deductionReason || 'Repairs'}).`
      : `${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} inspection for "${booking.property.title}" has been recorded.`;

    await prisma.notification.create({
      data: {
        userId: booking.tenantId,
        type: 'ANNOUNCEMENT',
        title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Completed`,
        message: tenantMsg,
        link: '/dashboard/tenant'
      }
    }).catch(() => null);

    if (inspectorId !== booking.property.landlordId) {
      await prisma.notification.create({
        data: {
          userId: booking.property.landlordId,
          type: 'ANNOUNCEMENT',
          title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Conducted`,
          message: `Inspection report filed for ${booking.tenant.firstName} at "${booking.property.title}".`,
          link: '/dashboard/landlord'
        }
      }).catch(() => null);
    }

    try {
      getIO().to(booking.tenantId).emit('notification', {
        title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Completed`,
        message: tenantMsg,
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

    const isStaff = await prisma.propertyStaff.findFirst({
      where: {
        propertyId: booking.propertyId,
        userId,
        canCheckInTenants: true
      }
    });

    if (booking.tenantId !== userId && booking.property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
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
      items: typeof ins.items === 'string' ? safeJsonParse(ins.items, []) : ins.items,
      photos: ins.photos ? (typeof ins.photos === 'string' ? safeJsonParse(ins.photos, []) : ins.photos) : []
    }));

    res.status(200).json({ inspections: parsedInspections });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Master Room Asset Vault Inventory for a Property
 */
export const getPropertyInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();

    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const isStaff = await prisma.propertyStaff.findFirst({
      where: { propertyId, userId }
    });

    // Tenants with a booking at this property, landlords, caretakers, and admins can read inventory
    if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
      const tenantBooking = await prisma.booking.findFirst({
        where: {
          propertyId,
          tenantId: userId,
          status: { in: ['CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED', 'APPROVED'] }
        }
      });
      if (!tenantBooking) {
        res.status(403).json({ message: 'Forbidden: You do not have access to this property inventory' });
        return;
      }
    }

    // Check CompoundNotice storage for master asset vault
    const vaultNotice = await prisma.compoundNotice.findFirst({
      where: {
        propertyId,
        title: '__MASTER_ASSET_VAULT__'
      }
    });

    let items: any[] = [];
    if (vaultNotice && vaultNotice.message) {
      items = safeJsonParse(vaultNotice.message, []);
    }

    res.status(200).json({ propertyId, items });
  } catch (error) {
    console.error('Error fetching property inventory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Save Master Room Asset Vault Inventory for a Property
 */
export const savePropertyInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const { items } = req.body;

    if (!Array.isArray(items)) {
      res.status(400).json({ message: 'Items must be an array of asset items' });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const isStaff = await prisma.propertyStaff.findFirst({
      where: { propertyId, userId }
    });

    if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
      res.status(403).json({ message: 'Forbidden: Only landlords or caretakers can update property assets' });
      return;
    }

    const existingNotice = await prisma.compoundNotice.findFirst({
      where: {
        propertyId,
        title: '__MASTER_ASSET_VAULT__'
      }
    });

    const itemsJson = JSON.stringify(items);

    if (existingNotice) {
      await prisma.compoundNotice.update({
        where: { id: existingNotice.id },
        data: {
          message: itemsJson,
          isActive: true
        }
      });
    } else {
      await prisma.compoundNotice.create({
        data: {
          propertyId,
          landlordId: property.landlordId,
          title: '__MASTER_ASSET_VAULT__',
          message: itemsJson,
          category: 'ASSET_INVENTORY',
          priority: 'NORMAL',
          isActive: true
        }
      });
    }

    try {
      getIO().emit('property_assets_updated', { propertyId, count: items.length });
    } catch (e) {}

    res.status(200).json({ message: 'Master room asset inventory saved successfully', count: items.length });
  } catch (error) {
    console.error('Error saving property inventory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
