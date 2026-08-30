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

    if (vehicle.tenantId !== tenantId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.vehicleRegistration.delete({ where: { id } });
    res.status(200).json({ message: 'Vehicle deregistered successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
