"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingInspections = exports.createOrUpdateInspection = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
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
        try {
            (0, socket_1.getIO)().to(booking.tenantId).emit('notification', {
                title: `📋 ${type === 'MOVE_IN' ? 'Move-In' : 'Move-Out'} Inspection Completed`,
                message: `Inspection report for ${booking.property.title} is now available in your dashboard.`,
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
        if (booking.tenantId !== userId && booking.property.landlordId !== userId && userRole !== 'ADMIN') {
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
            items: typeof ins.items === 'string' ? JSON.parse(ins.items) : ins.items,
            photos: ins.photos ? (typeof ins.photos === 'string' ? JSON.parse(ins.photos) : ins.photos) : []
        }));
        res.status(200).json({ inspections: parsedInspections });
    }
    catch (error) {
        console.error('Error fetching inspections:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getBookingInspections = getBookingInspections;
//# sourceMappingURL=inspection.controller.js.map