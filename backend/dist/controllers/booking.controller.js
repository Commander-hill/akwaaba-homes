"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingStatus = exports.getLandlordBookings = exports.getTenantBookings = exports.createBooking = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const notification_service_1 = require("../utils/notification.service");
const socket_1 = require("../socket");
const createBooking = async (req, res) => {
    try {
        const tenantId = req.user.id;
        const { propertyId, startDate, endDate } = req.body;
        if (!propertyId || !startDate || !endDate) {
            res.status(400).json({ message: 'Missing required fields' });
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
        if (!property.isAvailable) {
            res.status(400).json({ message: 'Property is currently not available for booking' });
            return;
        }
        const tenant = await prisma_1.default.user.findUnique({ where: { id: tenantId }, select: { firstName: true, lastName: true } });
        const booking = await prisma_1.default.booking.create({
            data: { tenantId, propertyId, startDate: new Date(startDate), endDate: new Date(endDate), status: 'PENDING' },
        });
        // Notify landlord via email + in-app
        await (0, notification_service_1.notifyBookingCreated)({
            landlordId: property.landlordId,
            landlordEmail: property.landlord.email,
            landlordName: property.landlord.firstName,
            tenantName: `${tenant?.firstName} ${tenant?.lastName}`,
            propertyTitle: property.title,
            bookingId: booking.id
        });
        // Real-time notification to landlord
        try {
            (0, socket_1.getIO)().to(property.landlordId).emit('notification', {
                title: 'New Booking Request',
                message: `${tenant?.firstName} ${tenant?.lastName} requested to book ${property.title}.`,
                type: 'booking'
            });
        }
        catch (e) {
            console.error('Socket notification failed', e);
        }
        res.status(201).json({ message: 'Booking request created successfully', booking });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createBooking = createBooking;
const getTenantBookings = async (req, res) => {
    try {
        const tenantId = req.user.id;
        const bookings = await prisma_1.default.booking.findMany({
            where: { tenantId },
            include: {
                property: { select: { title: true, location: true, price: true, images: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const parsedBookings = bookings.map(b => ({
            ...b,
            property: { ...b.property, images: b.property.images ? JSON.parse(b.property.images) : [] }
        }));
        res.status(200).json({ bookings: parsedBookings });
    }
    catch (error) {
        console.error('Error fetching tenant bookings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantBookings = getTenantBookings;
const getLandlordBookings = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const bookings = await prisma_1.default.booking.findMany({
            where: { property: { landlordId } },
            include: {
                property: { select: { title: true } },
                tenant: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, reputationScore: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ bookings });
    }
    catch (error) {
        console.error('Error fetching landlord bookings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordBookings = getLandlordBookings;
const updateBookingStatus = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const booking = await prisma_1.default.booking.findUnique({
            where: { id },
            include: {
                property: true,
                tenant: { select: { id: true, email: true, firstName: true, lastName: true } }
            }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        if (booking.property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const updatedBooking = await prisma_1.default.booking.update({ where: { id }, data: { status } });
        // Auto-generate Lease Agreement when approved
        if (status === 'APPROVED') {
            const existingAgreement = await prisma_1.default.leaseAgreement.findUnique({ where: { bookingId: id } });
            if (!existingAgreement) {
                await prisma_1.default.leaseAgreement.create({
                    data: {
                        bookingId: id,
                        status: 'PENDING_TENANT'
                    }
                });
            }
        }
        // Notify tenant about the status change
        if (['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(status)) {
            await (0, notification_service_1.notifyBookingStatusChanged)({
                tenantId: booking.tenant.id,
                tenantEmail: booking.tenant.email,
                tenantName: `${booking.tenant.firstName} ${booking.tenant.lastName}`,
                propertyTitle: booking.property.title,
                status
            });
            // Real-time notification to tenant
            try {
                (0, socket_1.getIO)().to(booking.tenant.id).emit('notification', {
                    title: `Booking ${status}`,
                    message: `Your booking for ${booking.property.title} was ${status.toLowerCase()}.`,
                    type: 'booking'
                });
            }
            catch (e) {
                console.error('Socket notification failed', e);
            }
        }
        await (0, auditLogger_1.logAudit)(req.user.id, 'UPDATE_BOOKING_STATUS', 'Booking', id, { status: booking.status }, { status }, req.ip || req.socket.remoteAddress);
        res.status(200).json({ message: `Booking status updated to ${status}`, booking: updatedBooking });
    }
    catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateBookingStatus = updateBookingStatus;
//# sourceMappingURL=booking.controller.js.map