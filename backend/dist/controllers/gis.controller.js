"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommuteInfo = exports.getPropertyCampusLandmarks = void 0;
const gis_1 = require("../utils/gis");
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Get Campus Landmark Distances and Transport Fares for a Property
 */
const getPropertyCampusLandmarks = async (req, res) => {
    try {
        const propertyId = req.params.id;
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
        // Determine nearest campus (default UCC or match by location string)
        let selectedCampus = 'UCC';
        const locLower = (property.location || '').toLowerCase();
        if (locLower.includes('legon') || locLower.includes('accra') || locLower.includes('ug')) {
            selectedCampus = 'UG';
        }
        else if (locLower.includes('kumasi') || locLower.includes('knust')) {
            selectedCampus = 'KNUST';
        }
        else if (locLower.includes('tamale') || locLower.includes('uds')) {
            selectedCampus = 'UDS';
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
        res.status(200).json({
            campus: selectedCampus,
            landmarks: landmarkDistances
        });
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
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property || !property.latitude || !property.longitude) {
            res.status(404).json({ message: 'Property location coordinates not available' });
            return;
        }
        const dist = (0, gis_1.calculateHaversineDistance)(property.latitude, property.longitude, 5.1054, -1.2825);
        const commute = (0, gis_1.estimateCommuteTimes)(dist);
        res.status(200).json(commute);
    }
    catch (error) {
        console.error('Error in getCommuteInfo:', error);
        res.status(500).json({ message: 'Error calculating commute info' });
    }
};
exports.getCommuteInfo = getCommuteInfo;
//# sourceMappingURL=gis.controller.js.map