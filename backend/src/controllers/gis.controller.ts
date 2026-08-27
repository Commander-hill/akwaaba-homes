import { Request, Response } from 'express';
import { CAMPUS_LANDMARKS, calculateHaversineDistance, estimateCommuteTimes } from '../utils/gis';
import prisma from '../utils/prisma';

/**
 * Get Campus Landmark Distances and Transport Fares for a Property
 */
export const getPropertyCampusLandmarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.id as string;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        location: true
      }
    });

    if (!property || !property.latitude || !property.longitude) {
      res.status(404).json({ message: 'Property coordinates not found' });
      return;
    }

    // Determine nearest campus (default UCC or match by location string)
    let selectedCampus = 'UCC';
    const locLower = (property.location || '').toLowerCase();
    if (locLower.includes('legon') || locLower.includes('accra') || locLower.includes('ug')) {
      selectedCampus = 'UG';
    } else if (locLower.includes('kumasi') || locLower.includes('knust')) {
      selectedCampus = 'KNUST';
    } else if (locLower.includes('tamale') || locLower.includes('uds')) {
      selectedCampus = 'UDS';
    }

    const landmarks = CAMPUS_LANDMARKS[selectedCampus] || CAMPUS_LANDMARKS['UCC'];

    const landmarkDistances = landmarks.map((landmark) => {
      const dist = calculateHaversineDistance(
        property.latitude!,
        property.longitude!,
        landmark.lat,
        landmark.lon
      );

      const commute = estimateCommuteTimes(dist);

      return {
        name: landmark.name,
        type: landmark.type,
        distanceKm: commute.distanceKm,
        walkingTimeMins: commute.walkingTimeMins,
        drivingTimeMins: commute.drivingTimeMins,
        trotroFareGHS: commute.trotroFareGHS,
        okadaFareGHS: commute.okadaFareGHS
      };
    });

    res.status(200).json({
      campus: selectedCampus,
      landmarks: landmarkDistances
    });
  } catch (error) {
    console.error('Error fetching campus landmarks:', error);
    res.status(500).json({ message: 'Failed to calculate campus landmarks' });
  }
};

/**
 * Legacy/Compat: Get commute info for a property
 */
export const getCommuteInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId as string;
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property || !property.latitude || !property.longitude) {
      res.status(404).json({ message: 'Property location coordinates not available' });
      return;
    }

    const dist = calculateHaversineDistance(property.latitude, property.longitude, 5.1054, -1.2825);
    const commute = estimateCommuteTimes(dist);

    res.status(200).json(commute);
  } catch (error) {
    console.error('Error in getCommuteInfo:', error);
    res.status(500).json({ message: 'Error calculating commute info' });
  }
};

