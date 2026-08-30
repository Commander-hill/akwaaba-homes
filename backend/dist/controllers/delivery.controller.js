"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmParcelPickup = exports.getTenantDeliveries = exports.logPackageDelivery = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
/**
 * Log an incoming package delivery (Porter / Security / Tenant)
 */
const logPackageDelivery = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { tenantId, propertyId, courierName, trackingNumber, packageDescription } = req.body;
        const targetTenantId = tenantId || userId;
        if (!propertyId || !courierName) {
            res.status(400).json({ message: 'Property ID and courier name are required' });
            return;
        }
        // Generate a 4-digit pickup code
        const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();
        const delivery = await prisma_1.default.packageDelivery.create({
            data: {
                tenantId: targetTenantId,
                propertyId,
                courierName: courierName.trim(),
                trackingNumber: trackingNumber ? trackingNumber.trim() : null,
                packageDescription: packageDescription ? packageDescription.trim() : null,
                pickupCode,
                status: 'PENDING_PICKUP',
                loggedBy: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Front Desk'
            },
            include: {
                property: { select: { id: true, title: true, location: true } }
            }
        });
        try {
            (0, socket_1.getIO)().to(targetTenantId).emit('package_arrived', {
                id: delivery.id,
                courierName: delivery.courierName,
                pickupCode: delivery.pickupCode,
                propertyTitle: delivery.property.title
            });
        }
        catch (e) { /* non-blocking */ }
        res.status(201).json({
            message: 'Parcel logged successfully! Pickup OTP generated.',
            delivery
        });
    }
    catch (error) {
        console.error('Error logging delivery:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.logPackageDelivery = logPackageDelivery;
/**
 * Get tenant's package deliveries
 */
const getTenantDeliveries = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const deliveries = await prisma_1.default.packageDelivery.findMany({
            where: { tenantId },
            include: {
                property: { select: { id: true, title: true, location: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ deliveries });
    }
    catch (error) {
        console.error('Error fetching deliveries:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantDeliveries = getTenantDeliveries;
/**
 * Confirm parcel pickup (Porter or Tenant verifies OTP)
 */
const confirmParcelPickup = async (req, res) => {
    try {
        const { id } = req.params;
        const { pickupCode } = req.body;
        const delivery = await prisma_1.default.packageDelivery.findUnique({ where: { id } });
        if (!delivery) {
            res.status(404).json({ message: 'Package record not found' });
            return;
        }
        if (pickupCode && pickupCode.trim() !== delivery.pickupCode) {
            res.status(400).json({ message: 'Invalid pickup OTP code' });
            return;
        }
        const updated = await prisma_1.default.packageDelivery.update({
            where: { id },
            data: {
                status: 'COLLECTED',
                collectedAt: new Date()
            }
        });
        res.status(200).json({ message: 'Parcel marked as collected ✅', delivery: updated });
    }
    catch (error) {
        console.error('Error confirming pickup:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.confirmParcelPickup = confirmParcelPickup;
//# sourceMappingURL=delivery.controller.js.map