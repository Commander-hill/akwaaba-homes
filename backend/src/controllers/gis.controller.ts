// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { CAMPUS_COORDINATES, calculateHaversineDistance, estimateCommuteTimes } from '../utils/gis';

export const getCommuteInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'TENANT') {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const { propertyId } = req.params;

    // Get the tenant's campus
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { campus: true }
    });

    if (!user || !user.campus) {
      res.status(400).json({ message: 'User campus not configured' });
      return;
    }

    const campusCoords = CAMPUS_COORDINATES[user.campus.toUpperCase()];
    if (!campusCoords) {
      // If we don't have exact coordinates for their campus, return a friendly message
      res.status(200).json({ 
        available: false, 
        message: 'Commute calculation not yet available for this campus.' 
      });
      return;
    }

    // Get the property coordinates
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { latitude: true, longitude: true }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Since latitude/longitude might be null in our DB if not provided by landlord yet
    if (property.latitude === null || property.longitude === null) {
      // Mock some coordinates near the campus for demo purposes if null
      const mockDistance = Math.random() * 5 + 0.5; // Random distance between 0.5km and 5.5km
      const commute = estimateCommuteTimes(mockDistance);
      
      res.status(200).json({
        available: true,
        isMocked: true,
        campus: user.campus,
        distanceKm: commute.distanceKm,
        walkingTimeMins: commute.walkingTimeMins,
        drivingTimeMins: commute.drivingTimeMins
      });
      return;
    }

    // Calculate real distance
    const distance = calculateHaversineDistance(
      property.latitude,
      property.longitude,
      campusCoords.lat,
      campusCoords.lon
    );

    const commute = estimateCommuteTimes(distance);

    res.status(200).json({
      available: true,
      isMocked: false,
      campus: user.campus,
      distanceKm: commute.distanceKm,
      walkingTimeMins: commute.walkingTimeMins,
      drivingTimeMins: commute.drivingTimeMins
    });
  } catch (error) {
    console.error('Error calculating commute info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
