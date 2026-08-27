"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPUS_LANDMARKS = exports.CAMPUS_COORDINATES = void 0;
exports.calculateHaversineDistance = calculateHaversineDistance;
exports.estimateCommuteTimes = estimateCommuteTimes;
exports.CAMPUS_COORDINATES = {
    'UCC': { lat: 5.1054, lon: -1.2825 }, // University of Cape Coast
    'KNUST': { lat: 6.6732, lon: -1.5674 }, // Kwame Nkrumah University of Science and Technology
    'UG': { lat: 5.6508, lon: -0.1869 }, // University of Ghana, Legon
    'UPSA': { lat: 5.6558, lon: -0.1709 }, // University of Professional Studies, Accra
    'UDS': { lat: 9.4285, lon: -0.8406 }, // University for Development Studies
};
exports.CAMPUS_LANDMARKS = {
    'UCC': [
        { name: 'Sam Jonah Central Library', type: 'LIBRARY', lat: 5.1060, lon: -1.2830 },
        { name: 'Science Auditorium (CA)', type: 'LECTURE_HALL', lat: 5.1040, lon: -1.2810 },
        { name: 'University Main Gate (West Campus)', type: 'CAMPUS_GATE', lat: 5.1010, lon: -1.2850 },
        { name: 'VALCO Hall / Shuttle Station', type: 'BUS_STOP', lat: 5.1080, lon: -1.2790 },
    ],
    'KNUST': [
        { name: 'Prempeh II Main Library', type: 'LIBRARY', lat: 6.6740, lon: -1.5680 },
        { name: 'Great Hall / Commercial Area', type: 'CAMPUS_GATE', lat: 6.6720, lon: -1.5650 },
        { name: 'College of Science Auditorium', type: 'LECTURE_HALL', lat: 6.6750, lon: -1.5690 },
        { name: 'Conti / Africa Hall Bus Terminal', type: 'BUS_STOP', lat: 6.6710, lon: -1.5660 },
    ],
    'UG': [
        { name: 'Balme Central Library', type: 'LIBRARY', lat: 5.6515, lon: -0.1875 },
        { name: 'JQB (Jones Quartey Building)', type: 'LECTURE_HALL', lat: 5.6530, lon: -0.1860 },
        { name: 'Okponglo Main Entrance Gate', type: 'CAMPUS_GATE', lat: 5.6480, lon: -0.1910 },
        { name: 'Night Market Shuttle Terminal', type: 'BUS_STOP', lat: 5.6560, lon: -0.1840 },
    ],
    'UDS': [
        { name: 'Tamale Campus Central Library', type: 'LIBRARY', lat: 9.4290, lon: -0.8410 },
        { name: 'Medical School Lecture Complex', type: 'LECTURE_HALL', lat: 9.4270, lon: -0.8390 },
        { name: 'Main Campus Administration Gate', type: 'CAMPUS_GATE', lat: 9.4260, lon: -0.8420 },
    ]
};
/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(2));
}
/**
 * Estimates commute times and fares based on straight-line distance.
 */
function estimateCommuteTimes(distanceKm) {
    const routedDistance = parseFloat((distanceKm * 1.3).toFixed(2));
    const walkingSpeedKmH = 4.8; // Average student walking speed
    const drivingSpeedKmH = 22; // Average TroTro/Shuttle speed with stops
    const walkingTimeMins = Math.max(2, Math.round((routedDistance / walkingSpeedKmH) * 60));
    const drivingTimeMins = Math.max(3, Math.round((routedDistance / drivingSpeedKmH) * 60));
    // Fare calculations in Ghana Cedi (GHS)
    const trotroFare = routedDistance <= 1.5 ? 3.50 : routedDistance <= 3.5 ? 5.50 : 8.00;
    const okadaFare = parseFloat((5.00 + routedDistance * 2.50).toFixed(2));
    return {
        distanceKm: routedDistance,
        walkingTimeMins,
        drivingTimeMins,
        trotroFareGHS: trotroFare,
        okadaFareGHS: okadaFare
    };
}
//# sourceMappingURL=gis.js.map