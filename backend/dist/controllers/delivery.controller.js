"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmParcelPickup = exports.getPropertyDeliveries = exports.getTenantDeliveries = exports.logPackageDelivery = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
/**
 * Log an incoming package delivery (Porter / Security / Tenant)
 */
const logPackageDelivery = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { tenantId, propertyId, courierName, carrier, trackingNumber, packageDescription, lockerNumber, location } = req.body;
        const courier = (courierName || carrier || 'Courier').trim();
        const tracking = trackingNumber ? String(trackingNumber).trim() : null;
        const description = (packageDescription || lockerNumber || location || '').trim() || null;
        if (!propertyId) {
            res.status(400).json({ message: 'Property ID is required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId },
            include: {
                bookings: {
                    where: { status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'] } },
                    select: { tenantId: true }
                }
            }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const targetTenantId = tenantId || (req.user?.role === 'TENANT' ? userId : null);
        if (!targetTenantId) {
            res.status(400).json({ message: 'Recipient tenant ID is required' });
            return;
        }
        // Generate a 4-digit pickup code
        const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();
        const delivery = await prisma_1.default.packageDelivery.create({
            data: {
                tenantId: targetTenantId,
                propertyId,
                courierName: courier,
                trackingNumber: tracking,
                packageDescription: description,
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
 * Get deliveries for a property (Landlord / Staff / Caretaker)
 */
const getPropertyDeliveries = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { propertyId } = req.query;
        let whereClause = {};
        if (propertyId) {
            const property = await prisma_1.default.property.findUnique({ where: { id: String(propertyId) } });
            if (!property) {
                res.status(404).json({ message: 'Property not found' });
                return;
            }
            if (property.landlordId !== userId && userRole !== 'ADMIN' && userRole !== 'STAFF' && userRole !== 'CARETAKER') {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
            whereClause.propertyId = String(propertyId);
        }
        else {
            if (userRole === 'LANDLORD') {
                whereClause.property = { landlordId: userId };
            }
            else if (userRole !== 'ADMIN') {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
        }
        const deliveries = await prisma_1.default.packageDelivery.findMany({
            where: whereClause,
            include: {
                property: { select: { id: true, title: true, location: true } },
                tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ deliveries });
    }
    catch (error) {
        console.error('Error fetching property deliveries:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyDeliveries = getPropertyDeliveries;
/**
 * Confirm parcel pickup (Porter or Tenant verifies OTP)
 */
const confirmParcelPickup = async (req, res) => {
    try {
        const { id } = req.params;
        const { pickupCode } = req.body;
        if (!pickupCode || typeof pickupCode !== 'string' || !pickupCode.trim()) {
            res.status(400).json({ message: '4-digit pickup OTP code is required' });
            return;
        }
        const delivery = await prisma_1.default.packageDelivery.findUnique({
            where: { id },
            include: { property: true }
        });
        if (!delivery) {
            res.status(404).json({ message: 'Package record not found' });
            return;
        }
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const isRecipient = delivery.tenantId === userId;
        const isLandlord = delivery.property?.landlordId === userId;
        const isStaffOrAdmin = userRole === 'STAFF' || userRole === 'CARETAKER' || userRole === 'ADMIN';
        if (!isRecipient && !isLandlord && !isStaffOrAdmin) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to confirm pickup for this package' });
            return;
        }
        if (pickupCode.trim() !== delivery.pickupCode) {
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