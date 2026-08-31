// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';

/**
 * Log an incoming package delivery (Porter / Security / Tenant)
 */
export const logPackageDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { tenantId, propertyId, courierName, carrier, trackingNumber, packageDescription, lockerNumber, location } = req.body;

    const courier = (courierName || carrier || 'Courier').trim();
    const tracking = trackingNumber ? String(trackingNumber).trim() : null;
    const description = (packageDescription || lockerNumber || location || '').trim() || null;

    if (!propertyId) {
      res.status(400).json({ message: 'Property ID is required' });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        bookings: {
          where: { status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] } },
          select: { tenantId: true }
        }
      }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const targetTenantId = tenantId || property.bookings[0]?.tenantId || userId;

    // Generate a 4-digit pickup code
    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

    const delivery = await prisma.packageDelivery.create({
      data: {
        tenantId: targetTenantId,
        propertyId,
        courierName: courier,
        trackingNumber: tracking,
        packageDescription: description,
        pickupCode,
        status: 'PENDING_PICKUP',
        loggedBy: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Front Desk'
      },
      include: {
        property: { select: { id: true, title: true, location: true } }
      }
    });

    try {
      getIO().to(targetTenantId).emit('package_arrived', {
        id: delivery.id,
        courierName: delivery.courierName,
        pickupCode: delivery.pickupCode,
        propertyTitle: delivery.property.title
      });
    } catch (e) { /* non-blocking */ }

    res.status(201).json({
      message: 'Parcel logged successfully! Pickup OTP generated.',
      delivery
    });
  } catch (error) {
    console.error('Error logging delivery:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get tenant's package deliveries
 */
export const getTenantDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const deliveries = await prisma.packageDelivery.findMany({
      where: { tenantId },
      include: {
        property: { select: { id: true, title: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ deliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Confirm parcel pickup (Porter or Tenant verifies OTP)
 */
export const confirmParcelPickup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { pickupCode } = req.body;

    const delivery = await prisma.packageDelivery.findUnique({ where: { id } });
    if (!delivery) {
      res.status(404).json({ message: 'Package record not found' });
      return;
    }

    if (pickupCode && pickupCode.trim() !== delivery.pickupCode) {
      res.status(400).json({ message: 'Invalid pickup OTP code' });
      return;
    }

    const updated = await prisma.packageDelivery.update({
      where: { id },
      data: {
        status: 'COLLECTED',
        collectedAt: new Date()
      }
    });

    res.status(200).json({ message: 'Parcel marked as collected ✅', delivery: updated });
  } catch (error) {
    console.error('Error confirming pickup:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
