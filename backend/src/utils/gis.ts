export const CAMPUS_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'UCC': { lat: 5.1054, lon: -1.2825 }, // University of Cape Coast
  'KNUST': { lat: 6.6732, lon: -1.5674 }, // Kwame Nkrumah University of Science and Technology
  'UG': { lat: 5.6508, lon: -0.1869 }, // University of Ghana, Legon
  'UPSA': { lat: 5.6558, lon: -0.1709 }, // University of Professional Studies, Accra
  'UDS': { lat: 9.4285, lon: -0.8406 }, // University for Development Studies
};

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return parseFloat(distance.toFixed(2));
}

/**
 * Estimates commute times based on straight-line distance.
 * Note: These are rough estimates assuming straight paths, which is why
 * we add a small 1.3x multiplier to account for road routing.
 */
export function estimateCommuteTimes(distanceKm: number) {
  // Add a 30% routing penalty (roads aren't straight lines)
  const routedDistance = distanceKm * 1.3;
  
  const walkingSpeedKmH = 5; // Average walking speed
  const drivingSpeedKmH = 25; // Average city driving/trotro speed with traffic
  
  const walkingTimeMins = Math.round((routedDistance / walkingSpeedKmH) * 60);
  const drivingTimeMins = Math.round((routedDistance / drivingSpeedKmH) * 60);
  
  return {
    distanceKm: routedDistance.toFixed(2),
    walkingTimeMins,
    drivingTimeMins
  };
}
