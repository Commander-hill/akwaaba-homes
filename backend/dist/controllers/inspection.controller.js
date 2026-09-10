"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePropertyMeterReading = exports.getPropertyMeterReadings = exports.savePropertyInventory = exports.getPropertyInventory = exports.getBookingInspections = exports.createOrUpdateInspection = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
const json_1 = require("../utils/json");
/**
 * Submit or Update Move-In / Move-Out Inspection Checklist
 */
const createOrUpdateInspection = async (req, res) => {
    try {
        const inspectorId = req.user?.id;
        const { bookingId, type, items, notes, photos, cautionDepositDeduction, deductionReason } = req.body;
        if (!bookingId || !type || !items) {
            res.status(400).json({ message: 'Booking ID, inspection type, and checklist items are required' });
            return;
        }
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: {
                property: true,
                tenant: true
            }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: {
                propertyId: booking.propertyId,
                userId: inspectorId,
                canCheckInTenants: true
            }
        });
        if (booking.property.landlordId !== inspectorId && booking.tenantId !== inspectorId && req.user?.role !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized for this inspection' });
            return;
        }
        const existing = await prisma_1.default.inspectionChecklist.findFirst({
            where: {
                bookingId,
                type
            }
        });
        let inspection;
        const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);
        const photosJson = photos ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : null;
        if (existing) {
            inspection = await prisma_1.default.inspectionChecklist.update({
                where: { id: existing.id },
                data: {
                    items: itemsJson,
                    notes: notes || null,
                    photos: photosJson,
                    cautionDepositDeduction: parseFloat(cautionDepositDeduction || '0'),
                    deductionReason: deductionReason || null,
                    signedAt: new Date()
                }
            });
        }
        else {
            inspection = await prisma_1.default.inspectionChecklist.create({
                data: {
                    bookingId,
                    propertyId: booking.propertyId,
                    type,
                    inspectorId,
                    items: itemsJson,
                    notes: notes || null,
                    photos: photosJson,
                    cautionDepositDeduction: parseFloat(cautionDepositDeduction || '0'),
                    deductionReason: deductionReason || null,
                    status: 'COMPLETED',
                    signedAt: new Date()
                }
            });
        }
        const hasCautionDeduction = type === 'MOVE_OUT' && parseFloat(cautionDepositDeduction || '0') > 0;
        const tenantMsg = hasCautionDeduction
            ? `Move-Out inspection for "${booking.property.title}" assessed caution deduction of GHS ${parseFloat(cautionDepositDeduction).toFixed(2)} (${deductionReason || 'Repairs'}).`
            : `${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} inspection for "${booking.property.title}" has been recorded.`;
        await prisma_1.default.notification.create({
            data: {
                userId: booking.tenantId,
                type: 'ANNOUNCEMENT',
                title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Completed`,
                message: tenantMsg,
                link: '/dashboard/tenant'
            }
        }).catch(() => null);
        if (inspectorId !== booking.property.landlordId) {
            await prisma_1.default.notification.create({
                data: {
                    userId: booking.property.landlordId,
                    type: 'ANNOUNCEMENT',
                    title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Conducted`,
                    message: `Inspection report filed for ${booking.tenant.firstName} at "${booking.property.title}".`,
                    link: '/dashboard/landlord'
                }
            }).catch(() => null);
        }
        try {
            (0, socket_1.getIO)().to(booking.tenantId).emit('notification', {
                title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Completed`,
                message: tenantMsg,
                type: 'agreement'
            });
            (0, socket_1.getIO)().emit('inspection_updated', { inspectionId: inspection.id, bookingId });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({
            message: 'Inspection checklist recorded successfully',
            inspection
        });
    }
    catch (error) {
        console.error('Error recording inspection checklist:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createOrUpdateInspection = createOrUpdateInspection;
/**
 * Get Inspection Checklists for a Booking
 */
const getBookingInspections = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: {
                property: true
            }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: {
                propertyId: booking.propertyId,
                userId,
                canCheckInTenants: true
            }
        });
        if (booking.tenantId !== userId && booking.property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const inspections = await prisma_1.default.inspectionChecklist.findMany({
            where: { bookingId },
            include: {
                inspector: {
                    select: { id: true, firstName: true, lastName: true, role: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        const parsedInspections = inspections.map((ins) => ({
            ...ins,
            items: typeof ins.items === 'string' ? (0, json_1.safeJsonParse)(ins.items, []) : ins.items,
            photos: ins.photos ? (typeof ins.photos === 'string' ? (0, json_1.safeJsonParse)(ins.photos, []) : ins.photos) : []
        }));
        res.status(200).json({ inspections: parsedInspections });
    }
    catch (error) {
        console.error('Error fetching inspections:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getBookingInspections = getBookingInspections;
/**
 * Get Master Room Asset Vault Inventory for a Property
 */
const getPropertyInventory = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId, userId }
        });
        // Tenants with a booking at this property, landlords, caretakers, and admins can read inventory
        if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
            const tenantBooking = await prisma_1.default.booking.findFirst({
                where: {
                    propertyId,
                    tenantId: userId,
                    status: { in: ['CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED', 'APPROVED'] }
                }
            });
            if (!tenantBooking) {
                res.status(403).json({ message: 'Forbidden: You do not have access to this property inventory' });
                return;
            }
        }
        // Check CompoundNotice storage for master asset vault
        const vaultNotice = await prisma_1.default.compoundNotice.findFirst({
            where: {
                propertyId,
                title: '__MASTER_ASSET_VAULT__'
            }
        });
        let items = [];
        if (vaultNotice && vaultNotice.message) {
            items = (0, json_1.safeJsonParse)(vaultNotice.message, []);
        }
        res.status(200).json({ propertyId, items });
    }
    catch (error) {
        console.error('Error fetching property inventory:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyInventory = getPropertyInventory;
/**
 * Save Master Room Asset Vault Inventory for a Property
 */
const savePropertyInventory = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const { items } = req.body;
        if (!Array.isArray(items)) {
            res.status(400).json({ message: 'Items must be an array of asset items' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId, userId }
        });
        if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Forbidden: Only landlords or caretakers can update property assets' });
            return;
        }
        const existingNotice = await prisma_1.default.compoundNotice.findFirst({
            where: {
                propertyId,
                title: '__MASTER_ASSET_VAULT__'
            }
        });
        const itemsJson = JSON.stringify(items);
        if (existingNotice) {
            await prisma_1.default.compoundNotice.update({
                where: { id: existingNotice.id },
                data: {
                    message: itemsJson,
                    isActive: true
                }
            });
        }
        else {
            await prisma_1.default.compoundNotice.create({
                data: {
                    propertyId,
                    landlordId: property.landlordId,
                    title: '__MASTER_ASSET_VAULT__',
                    message: itemsJson,
                    category: 'ASSET_INVENTORY',
                    priority: 'NORMAL',
                    isActive: true
                }
            });
        }
        try {
            (0, socket_1.getIO)().emit('property_assets_updated', { propertyId, count: items.length });
        }
        catch (e) { }
        res.status(200).json({ message: 'Master room asset inventory saved successfully', count: items.length });
    }
    catch (error) {
        console.error('Error saving property inventory:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.savePropertyInventory = savePropertyInventory;
/**
 * Get Utility Sub-Meter Readings Log for a Property
 */
const getPropertyMeterReadings = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId, userId }
        });
        if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
            const tenantBooking = await prisma_1.default.booking.findFirst({
                where: {
                    propertyId,
                    tenantId: userId,
                    status: { in: ['CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED', 'APPROVED'] }
                }
            });
            if (!tenantBooking) {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
        }
        const meterNotice = await prisma_1.default.compoundNotice.findFirst({
            where: {
                propertyId,
                title: '__METER_READINGS_LOG__'
            }
        });
        let readings = [];
        if (meterNotice && meterNotice.message) {
            readings = (0, json_1.safeJsonParse)(meterNotice.message, []);
        }
        res.status(200).json({ propertyId, readings });
    }
    catch (error) {
        console.error('Error fetching property meter readings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyMeterReadings = getPropertyMeterReadings;
/**
 * Save / Append a Utility Sub-Meter Reading for a Property
 */
const savePropertyMeterReading = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const { reading } = req.body;
        if (!reading || !reading.unitNumber || reading.currentReading === undefined) {
            res.status(400).json({ message: 'Valid meter reading object is required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId, userId }
        });
        if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Forbidden: Only landlords or caretakers can log meter readings' });
            return;
        }
        const existingNotice = await prisma_1.default.compoundNotice.findFirst({
            where: {
                propertyId,
                title: '__METER_READINGS_LOG__'
            }
        });
        let existingReadings = [];
        if (existingNotice && existingNotice.message) {
            existingReadings = (0, json_1.safeJsonParse)(existingNotice.message, []);
        }
        const updatedReadings = [reading, ...existingReadings.filter((r) => r.id !== reading.id)];
        const readingsJson = JSON.stringify(updatedReadings);
        if (existingNotice) {
            await prisma_1.default.compoundNotice.update({
                where: { id: existingNotice.id },
                data: {
                    message: readingsJson,
                    isActive: true
                }
            });
        }
        else {
            await prisma_1.default.compoundNotice.create({
                data: {
                    propertyId,
                    landlordId: property.landlordId,
                    title: '__METER_READINGS_LOG__',
                    message: readingsJson,
                    category: 'UTILITY',
                    priority: 'NORMAL',
                    isActive: true
                }
            });
        }
        // In-app notification to landlord if logged by caretaker
        if (property.landlordId !== userId) {
            await prisma_1.default.notification.create({
                data: {
                    userId: property.landlordId,
                    type: 'ANNOUNCEMENT',
                    title: `⚡ New Sub-Meter Reading Logged`,
                    message: `Caretaker recorded ${reading.utilityType} reading for Unit ${reading.unitNumber} (${reading.currentReading} ${reading.unitOfMeasure || ''}).`,
                    link: '/dashboard/landlord'
                }
            }).catch(() => null);
        }
        try {
            (0, socket_1.getIO)().emit('meter_reading_logged', { propertyId, reading });
        }
        catch (e) { }
        res.status(200).json({ message: 'Meter reading saved successfully', reading });
    }
    catch (error) {
        console.error('Error saving meter reading:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.savePropertyMeterReading = savePropertyMeterReading;
//# sourceMappingURL=inspection.controller.js.map