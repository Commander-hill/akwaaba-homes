// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Register a resident or guest vehicle
 */
export const registerVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const { propertyId, vehicleMake, vehicleModel, licensePlate, color, parkingSlotNumber, passType } = req.body;

    if (!propertyId || !vehicleMake || !vehicleModel || !licensePlate) {
      res.status(400).json({ message: 'Property ID, vehicle make, model, and license plate are required' });
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
        res.status(403).json({ message: 'Only residents with an active or confirmed booking can register vehicles for this property' });
        return;
      }
    }

    const vehicle = await prisma.vehicleRegistration.create({
      data: {
        tenantId,
        propertyId,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
        color: color || null,
        parkingSlotNumber: parkingSlotNumber || null,
        passType: passType || 'RESIDENT',
        status: 'ACTIVE'
      },
      include: {
        property: { select: { id: true, title: true, location: true } }
      }
    });

    res.status(201).json({
      message: 'Vehicle registered for security gate clearance',
      vehicle
    });
  } catch (error) {
    console.error('Error registering vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify vehicle license plate at estate security gatehouse
 */
export const verifyVehiclePlate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { licensePlate } = req.query;
    if (!licensePlate) {
      res.status(400).json({ message: 'License plate query parameter is required' });
      return;
    }

    const cleanPlate = String(licensePlate).trim().toUpperCase();
    const vehicle = await prisma.vehicleRegistration.findFirst({
      where: {
        licensePlate: cleanPlate,
        status: 'ACTIVE'
      },
      include: {
        property: { select: { id: true, title: true, location: true } },
        tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } }
      }
    });

    if (!vehicle) {
      res.status(404).json({ message: `No active gate pass found for license plate: ${cleanPlate}`, authorized: false });
      return;
    }

    res.status(200).json({
      message: 'Vehicle Authorized for Security Gate Clearance ✅',
      authorized: true,
      vehicle
    });
  } catch (error) {
    console.error('Error verifying vehicle plate:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get registered vehicles for a property (Landlord / Staff / Caretaker)
 */
export const getPropertyVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();

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

    const vehicles = await prisma.vehicleRegistration.findMany({
      where: { propertyId, status: 'ACTIVE' },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ vehicles });
  } catch (error) {
    console.error('Error fetching property vehicles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get tenant's registered vehicles
 */
export const getTenantVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const vehicles = await prisma.vehicleRegistration.findMany({
      where: { tenantId },
      include: {
        property: { select: { id: true, title: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete / Deregister a vehicle
 */
export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.id;
    const { id } = req.params;

    const vehicle = await prisma.vehicleRegistration.findUnique({ where: { id } });
    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle record not found' });
      return;
    }

    const isLandlord = await prisma.property.findFirst({
      where: { id: vehicle.propertyId, landlordId: tenantId }
    });
    const isStaff = await prisma.propertyStaff.findFirst({
      where: { propertyId: vehicle.propertyId, userId: tenantId }
    });

    if (vehicle.tenantId !== tenantId && req.user?.role !== 'ADMIN' && !isLandlord && !isStaff) {
      res.status(403).json({ message: 'Forbidden: You are not authorized to deregister this vehicle' });
      return;
    }

    await prisma.vehicleRegistration.delete({ where: { id } });
    res.status(200).json({ message: 'Vehicle deregistered successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
