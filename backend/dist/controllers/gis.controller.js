"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommuteInfo = exports.getPropertyCampusLandmarks = void 0;
const gis_1 = require("../utils/gis");
const prisma_1 = __importDefault(require("../utils/prisma"));
const cache_1 = __importDefault(require("../utils/cache"));
/**
 * Get Campus Landmark Distances and Transport Fares for a Property
 */
const getPropertyCampusLandmarks = async (req, res) => {
    try {
        const propertyId = req.params.id;
        const cacheKey = `property:gis:${propertyId}`;
        const cachedData = cache_1.default.get(cacheKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }
        const property = await prisma_1.default.property.findUnique({
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
        // Determine nearest campus accurately using GPS coordinates
        let selectedCampus = 'UCC';
        let shortestCampusDistance = Infinity;
        for (const [campusKey, coords] of Object.entries(gis_1.CAMPUS_COORDINATES)) {
            const distanceToCampus = (0, gis_1.calculateHaversineDistance)(property.latitude, property.longitude, coords.lat, coords.lon);
            if (distanceToCampus < shortestCampusDistance) {
                shortestCampusDistance = distanceToCampus;
                selectedCampus = campusKey;
            }
        }
        // Fallback if property location string provides a more specific campus hint
        if (shortestCampusDistance > 80 && property.location) {
            const locLower = property.location.toLowerCase();
            if (locLower.includes('upsa') || locLower.includes('madina')) {
                selectedCampus = 'UPSA';
            }
            else if (locLower.includes('legon') || locLower.includes('accra') || locLower.includes('ug')) {
                selectedCampus = 'UG';
            }
            else if (locLower.includes('kumasi') || locLower.includes('knust')) {
                selectedCampus = 'KNUST';
            }
            else if (locLower.includes('tamale') || locLower.includes('uds')) {
                selectedCampus = 'UDS';
            }
            else if (locLower.includes('cape coast') || locLower.includes('ucc')) {
                selectedCampus = 'UCC';
            }
        }
        const landmarks = gis_1.CAMPUS_LANDMARKS[selectedCampus] || gis_1.CAMPUS_LANDMARKS['UCC'];
        const landmarkDistances = landmarks.map((landmark) => {
            const dist = (0, gis_1.calculateHaversineDistance)(property.latitude, property.longitude, landmark.lat, landmark.lon);
            const commute = (0, gis_1.estimateCommuteTimes)(dist);
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
        const responseData = {
            campus: selectedCampus,
            landmarks: landmarkDistances
        };
        // Cache computed GIS landmarks for 1 hour (3600 seconds)
        cache_1.default.set(cacheKey, responseData, 3600);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error('Error fetching campus landmarks:', error);
        res.status(500).json({ message: 'Failed to calculate campus landmarks' });
    }
};
exports.getPropertyCampusLandmarks = getPropertyCampusLandmarks;
/**
 * Legacy/Compat: Get commute info for a property
 */
const getCommuteInfo = async (req, res) => {
    try {
        const propertyId = req.params.propertyId;
        const cacheKey = `property:commute:${propertyId}`;
        const cachedCommute = cache_1.default.get(cacheKey);
        if (cachedCommute) {
            res.status(200).json(cachedCommute);
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property || !property.latitude || !property.longitude) {
            res.status(404).json({ message: 'Property location coordinates not available' });
            return;
        }
        let shortestDistance = Infinity;
        for (const coords of Object.values(gis_1.CAMPUS_COORDINATES)) {
            const d = (0, gis_1.calculateHaversineDistance)(property.latitude, property.longitude, coords.lat, coords.lon);
            if (d < shortestDistance) {
                shortestDistance = d;
            }
        }
        const dist = shortestDistance < Infinity ? shortestDistance : (0, gis_1.calculateHaversineDistance)(property.latitude, property.longitude, 5.1054, -1.2825);
        const commute = (0, gis_1.estimateCommuteTimes)(dist);
        // Cache computed commute calculation for 1 hour
        cache_1.default.set(cacheKey, commute, 3600);
        res.status(200).json(commute);
    }
    catch (error) {
        console.error('Error in getCommuteInfo:', error);
        res.status(500).json({ message: 'Error calculating commute info' });
    }
};
exports.getCommuteInfo = getCommuteInfo;
//# sourceMappingURL=gis.controller.js.map