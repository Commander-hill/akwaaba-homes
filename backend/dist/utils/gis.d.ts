export declare const CAMPUS_COORDINATES: Record<string, {
    lat: number;
    lon: number;
}>;
/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in kilometers
 */
export declare function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Estimates commute times based on straight-line distance.
 * Note: These are rough estimates assuming straight paths, which is why
 * we add a small 1.3x multiplier to account for road routing.
 */
export declare function estimateCommuteTimes(distanceKm: number): {
    distanceKm: string;
    walkingTimeMins: number;
    drivingTimeMins: number;
};
//# sourceMappingURL=gis.d.ts.map