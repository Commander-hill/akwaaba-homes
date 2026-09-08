"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelServiceBooking = exports.getTenantServiceBookings = exports.updateServiceBookingStatus = exports.getPropertyServiceBookings = exports.createServiceBooking = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
const ESTIMATED_RATES = {
    AC_SERVICING: 250,
    DEEP_CLEANING: 350,
    PLUMBING: 180,
    ELECTRICAL: 200,
    FUMIGATION: 400,
    WATER_FILTER: 220
};
/**
 * Request an on-demand home service
 */
const createServiceBooking = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const { propertyId, serviceType, preferredDate, timeSlot, notes } = req.body;
        if (!propertyId || !serviceType || !preferredDate) {
            res.status(400).json({ message: 'Property ID, service type, and preferred date are required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (req.user?.role !== 'ADMIN') {
            const activeBooking = await prisma_1.default.booking.findFirst({
                where: {
                    tenantId,
                    propertyId,
                    status: { in: ['CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN', 'APPROVED'] }
                }
            });
            if (!activeBooking) {
                res.status(403).json({ message: 'Only residents with an active or confirmed booking can request home services for this property' });
                return;
            }
        }
        const estimatedCost = ESTIMATED_RATES[serviceType] || 200;
        const booking = await prisma_1.default.serviceBooking.create({
            data: {
                tenantId,
                propertyId,
                serviceType,
                preferredDate: new Date(preferredDate),
                timeSlot: timeSlot || 'MORNING (8AM - 12PM)',
                estimatedCost,
                notes: notes || null,
                status: 'PENDING'
            },
            include: {
                property: { select: { id: true, title: true, location: true } }
            }
        });
        await prisma_1.default.notification.create({
            data: {
                userId: property.landlordId,
                type: 'ANNOUNCEMENT',
                title: '🛠️ New Home Service Request',
                message: `A resident requested ${serviceType.replace('_', ' ')} for ${property.title}.`,
                link: '/dashboard/landlord'
            }
        }).catch(() => { });
        try {
            const io = (0, socket_1.getIO)();
            io.to(tenantId).emit('service_booking_created', booking);
            io.to(property.landlordId).emit('notification', {
                title: '🛠️ New Home Service Request',
                message: `A resident requested ${serviceType.replace('_', ' ')} for ${property.title}.`,
                type: 'service'
            });
        }
        catch (e) { /* non-blocking */ }
        res.status(201).json({
            message: 'Service appointment booked! A vetted technician will be dispatched.',
            booking
        });
    }
    catch (error) {
        console.error('Error booking service:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createServiceBooking = createServiceBooking;
/**
 * Get service bookings for a property (Landlord / Admin)
 */
const getPropertyServiceBookings = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const property = await prisma_1.default.property.findUnique({ where: { id: propertyId } });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId, userId, isActive: true }
        });
        if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const bookings = await prisma_1.default.serviceBooking.findMany({
            where: { propertyId },
            include: {
                tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true } }
            },
            orderBy: { preferredDate: 'desc' }
        });
        res.status(200).json({ bookings });
    }
    catch (error) {
        console.error('Error fetching property service bookings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyServiceBookings = getPropertyServiceBookings;
/**
 * Update service booking status (Landlord / Admin / Staff / Tenant)
 */
const updateServiceBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, technicianName, technicianPhone, notes } = req.body;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
            return;
        }
        const booking = await prisma_1.default.serviceBooking.findUnique({
            where: { id },
            include: { property: true }
        });
        if (!booking) {
            res.status(404).json({ message: 'Service booking not found' });
            return;
        }
        const isLandlord = booking.property.landlordId === userId;
        const isTenant = booking.tenantId === userId;
        const isAdmin = userRole === 'ADMIN';
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId: booking.propertyId, userId, isActive: true }
        });
        if (!isLandlord && !isAdmin && !isStaff && (!isTenant || status !== 'CANCELLED')) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const updateData = { status };
        if (technicianName)
            updateData.technicianName = technicianName;
        if (technicianPhone)
            updateData.technicianPhone = technicianPhone;
        if (notes)
            updateData.notes = notes;
        if (status === 'COMPLETED')
            updateData.completedAt = new Date();
        const updated = await prisma_1.default.serviceBooking.update({
            where: { id },
            data: updateData
        });
        // Notify tenant of service status update
        await prisma_1.default.notification.create({
            data: {
                userId: booking.tenantId,
                type: 'ANNOUNCEMENT',
                title: `🛠️ Home Service: ${status}`,
                message: `Your ${booking.serviceType.replace('_', ' ')} appointment is now ${status}.${technicianName ? ` Assigned: ${technicianName} (${technicianPhone || 'On-site'})` : ''}`,
                link: '/dashboard/tenant'
            }
        }).catch(() => { });
        try {
            const io = (0, socket_1.getIO)();
            io.to(booking.tenantId).emit('service_booking_updated', updated);
            io.to(booking.tenantId).emit('notification', {
                title: `🛠️ Home Service: ${status}`,
                message: `Your ${booking.serviceType.replace('_', ' ')} appointment is now ${status}.`,
                type: 'service'
            });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({ message: `Service booking marked as ${status}`, booking: updated });
    }
    catch (error) {
        console.error('Error updating service booking status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateServiceBookingStatus = updateServiceBookingStatus;
/**
 * Get tenant's service bookings
 */
const getTenantServiceBookings = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const bookings = await prisma_1.default.serviceBooking.findMany({
            where: { tenantId },
            include: {
                property: { select: { id: true, title: true, location: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ bookings });
    }
    catch (error) {
        console.error('Error fetching service bookings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantServiceBookings = getTenantServiceBookings;
/**
 * Cancel a service booking
 */
const cancelServiceBooking = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const { id } = req.params;
        const booking = await prisma_1.default.serviceBooking.findUnique({ where: { id } });
        if (!booking) {
            res.status(404).json({ message: 'Service booking not found' });
            return;
        }
        if (booking.tenantId !== tenantId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const updated = await prisma_1.default.serviceBooking.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        res.status(200).json({ message: 'Service booking cancelled', booking: updated });
    }
    catch (error) {
        console.error('Error cancelling service booking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.cancelServiceBooking = cancelServiceBooking;
//# sourceMappingURL=serviceBooking.controller.js.map