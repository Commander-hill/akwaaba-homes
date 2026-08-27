export declare const CAMPUS_COORDINATES: Record<string, {
    lat: number;
    lon: number;
}>;
export declare const CAMPUS_LANDMARKS: Record<string, {
    name: string;
    type: string;
    lat: number;
    lon: number;
}[]>;
/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in kilometers
 */
export declare function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Estimates commute times and fares based on straight-line distance.
 */
export declare function estimateCommuteTimes(distanceKm: number): {
    distanceKm: number;
    walkingTimeMins: number;
    drivingTimeMins: number;
    trotroFareGHS: number;
    okadaFareGHS: number;
};
//# sourceMappingURL=gis.d.ts.map