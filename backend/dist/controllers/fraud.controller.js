"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFraudAction = exports.scanFraudRisk = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("../utils/cache"));
const scanFraudRisk = async (req, res) => {
    try {
        const properties = await prisma_1.default.property.findMany({
            include: {
                landlord: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        ghanaCardStatus: true,
                        createdAt: true
                    }
                },
                rooms: { select: { price: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Compute campus average prices
        const areaPrices = {};
        properties.forEach(p => {
            const area = p.location.split(',')[0].trim();
            if (!areaPrices[area])
                areaPrices[area] = [];
            areaPrices[area].push(p.price);
        });
        const areaAverages = {};
        Object.keys(areaPrices).forEach(area => {
            const prices = areaPrices[area];
            areaAverages[area] = prices.reduce((a, b) => a + b, 0) / prices.length;
        });
        // Map image URLs to detect duplicates across different landlords
        const imageLandlordMap = {};
        const duplicateImages = new Set();
        properties.forEach(p => {
            const images = Array.isArray(p.images) ? p.images : [];
            images.forEach(img => {
                if (imageLandlordMap[img] && imageLandlordMap[img] !== p.landlordId) {
                    duplicateImages.add(img);
                }
                else {
                    imageLandlordMap[img] = p.landlordId;
                }
            });
        });
        // Calculate risk per property
        const fraudReports = properties.map(p => {
            let riskScore = 0;
            const flags = [];
            // 1. Price Anomaly Check
            const area = p.location.split(',')[0].trim();
            const avgPrice = areaAverages[area] || 1500;
            if (p.price < avgPrice * 0.35) {
                riskScore += 35;
                flags.push(`Suspiciously Low Price (GHS ${p.price} vs. ${area} Avg GHS ${Math.round(avgPrice)})`);
            }
            else if (p.price > avgPrice * 2.5) {
                riskScore += 20;
                flags.push(`Unusually High Price (GHS ${p.price} vs. ${area} Avg GHS ${Math.round(avgPrice)})`);
            }
            // 2. Duplicate Photo Signal
            const images = Array.isArray(p.images) ? p.images : [];
            const hasDuplicate = images.some(img => duplicateImages.has(img));
            if (hasDuplicate) {
                riskScore += 40;
                flags.push('Duplicate Property Photos (Shared with another Landlord listing)');
            }
            // 3. Landlord Identity Signal
            if (p.landlord.ghanaCardStatus === 'REJECTED') {
                riskScore += 30;
                flags.push('Landlord Ghana Card ID Verification Failed / Rejected');
            }
            else if (p.landlord.ghanaCardStatus !== 'APPROVED') {
                riskScore += 15;
                flags.push('Unverified Landlord (Ghana Card Pending)');
            }
            // 4. Missing Property Images or Details
            if (images.length === 0) {
                riskScore += 15;
                flags.push('No Property Photos Provided');
            }
            const riskLevel = riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';
            return {
                propertyId: p.id,
                title: p.title,
                location: p.location,
                landlordName: `${p.landlord.firstName} ${p.landlord.lastName}`,
                landlordEmail: p.landlord.email,
                landlordId: p.landlord.id,
                ghanaCardStatus: p.landlord.ghanaCardStatus,
                price: p.price,
                riskScore: Math.min(100, riskScore),
                riskLevel,
                flags,
                createdAt: p.createdAt
            };
        });
        const highRiskListings = fraudReports.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'MEDIUM');
        res.status(200).json({
            totalScanned: properties.length,
            highRiskCount: fraudReports.filter(r => r.riskLevel === 'HIGH').length,
            mediumRiskCount: fraudReports.filter(r => r.riskLevel === 'MEDIUM').length,
            reports: highRiskListings
        });
    }
    catch (error) {
        console.error('Error scanning property fraud risk:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.scanFraudRisk = scanFraudRisk;
const resolveFraudAction = async (req, res) => {
    try {
        const { propertyId, action } = req.body; // APPROVE, SUSPEND_PROPERTY, SUSPEND_LANDLORD
        if (!propertyId || !['APPROVE', 'SUSPEND_PROPERTY', 'SUSPEND_LANDLORD'].includes(action)) {
            res.status(400).json({ message: 'Valid propertyId and action are required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId },
            include: { landlord: true }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (action === 'SUSPEND_PROPERTY') {
            await prisma_1.default.property.update({
                where: { id: propertyId },
                data: { approvalStatus: 'REJECTED' }
            });
            (0, socket_1.getIO)().to(property.landlordId).emit('notification', {
                title: 'Listing Flagged & Suspended',
                message: `Your listing for "${property.title}" was suspended due to a safety review. Please contact support.`,
                type: 'SECURITY'
            });
        }
        else if (action === 'SUSPEND_LANDLORD') {
            await prisma_1.default.user.update({
                where: { id: property.landlordId },
                data: { isSuspended: true }
            });
            await prisma_1.default.property.update({
                where: { id: propertyId },
                data: { approvalStatus: 'REJECTED' }
            });
            (0, socket_1.getIO)().to(property.landlordId).emit('user_updated', { isSuspended: true });
        }
        else if (action === 'APPROVE') {
            await prisma_1.default.property.update({
                where: { id: propertyId },
                data: { approvalStatus: 'APPROVED' }
            });
        }
        (0, socket_1.getIO)().emit('property_updated', { propertyId });
        cache_1.default.flushAll();
        res.status(200).json({ message: `Fraud resolution action [${action}] applied successfully.` });
    }
    catch (error) {
        console.error('Error resolving fraud action:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.resolveFraudAction = resolveFraudAction;
//# sourceMappingURL=fraud.controller.js.map