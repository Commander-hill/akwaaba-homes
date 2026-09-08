"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondLeaseRenewal = exports.getLandlordRenewals = exports.getTenantRenewals = exports.requestLeaseRenewal = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("../utils/cache"));
/**
 * Submit a lease renewal request
 */
const requestLeaseRenewal = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const { bookingId, proposedDurationMonths, proposedStartDate, proposedRent, tenantNotes } = req.body;
        if (!bookingId || !proposedStartDate) {
            res.status(400).json({ message: 'Booking ID and proposed start date are required' });
            return;
        }
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: { property: true }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        if (booking.tenantId !== tenantId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const renewal = await prisma_1.default.leaseRenewalRequest.create({
            data: {
                tenantId,
                propertyId: booking.propertyId,
                bookingId,
                proposedDurationMonths: parseInt(proposedDurationMonths || '12', 10),
                proposedStartDate: new Date(proposedStartDate),
                proposedRent: proposedRent ? parseFloat(proposedRent) : null,
                tenantNotes: tenantNotes || null,
                status: 'PENDING'
            },
            include: {
                property: { select: { id: true, title: true, location: true, landlordId: true } }
            }
        });
        await prisma_1.default.notification.create({
            data: {
                userId: booking.property.landlordId,
                type: 'ANNOUNCEMENT',
                title: '📑 New Lease Renewal Request',
                message: `Tenant submitted a ${renewal.proposedDurationMonths}-month renewal request for "${booking.property.title}".`,
                link: '/dashboard/landlord'
            }
        }).catch(() => null);
        try {
            (0, socket_1.getIO)().to(booking.property.landlordId).emit('lease_renewal_requested', renewal);
        }
        catch (e) { /* non-blocking */ }
        res.status(201).json({
            message: 'Lease renewal application submitted to your landlord',
            renewal
        });
    }
    catch (error) {
        console.error('Error requesting lease renewal:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.requestLeaseRenewal = requestLeaseRenewal;
/**
 * Get tenant's renewal requests
 */
const getTenantRenewals = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const renewals = await prisma_1.default.leaseRenewalRequest.findMany({
            where: { tenantId },
            include: {
                property: { select: { id: true, title: true, location: true } },
                booking: { select: { id: true, startDate: true, endDate: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ renewals });
    }
    catch (error) {
        console.error('Error fetching renewal requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantRenewals = getTenantRenewals;
/**
 * Get landlord's incoming lease renewal requests
 */
const getLandlordRenewals = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const renewals = await prisma_1.default.leaseRenewalRequest.findMany({
            where: {
                property: { landlordId }
            },
            include: {
                property: { select: { id: true, title: true, location: true } },
                tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
                booking: { select: { id: true, startDate: true, endDate: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ renewals });
    }
    catch (error) {
        console.error('Error fetching landlord renewal requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordRenewals = getLandlordRenewals;
/**
 * Respond to a lease renewal request (Landlord: ACCEPTED, DECLINED, NEGOTIATING)
 */
const respondLeaseRenewal = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { id } = req.params;
        const { status, landlordResponse } = req.body;
        const validStatuses = ['ACCEPTED', 'DECLINED', 'NEGOTIATING'];
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
            return;
        }
        const renewal = await prisma_1.default.leaseRenewalRequest.findUnique({
            where: { id },
            include: { property: true }
        });
        if (!renewal) {
            res.status(404).json({ message: 'Lease renewal request not found' });
            return;
        }
        if (renewal.property.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const updated = await prisma_1.default.leaseRenewalRequest.update({
            where: { id },
            data: {
                status,
                landlordResponse: landlordResponse || null,
                respondedAt: new Date()
            },
            include: {
                property: { select: { id: true, title: true, location: true } }
            }
        });
        await prisma_1.default.notification.create({
            data: {
                userId: renewal.tenantId,
                type: 'ANNOUNCEMENT',
                title: status === 'ACCEPTED' ? '🎉 Lease Renewal Approved!' : status === 'DECLINED' ? 'Lease Renewal Declined' : 'Lease Renewal Status Updated',
                message: `Your landlord marked your lease renewal request as ${status} for "${updated.property.title}".`,
                link: '/dashboard/tenant'
            }
        }).catch(() => null);
        // If accepted, automatically prolong the underlying booking duration
        if (status === 'ACCEPTED') {
            try {
                const currentBooking = await prisma_1.default.booking.findUnique({ where: { id: renewal.bookingId } });
                if (currentBooking) {
                    const currentEnd = new Date(currentBooking.endDate);
                    const newEnd = new Date(currentEnd);
                    newEnd.setMonth(newEnd.getMonth() + (renewal.proposedDurationMonths || 12));
                    await prisma_1.default.booking.update({
                        where: { id: renewal.bookingId },
                        data: {
                            endDate: newEnd,
                            status: 'ACTIVE'
                        }
                    });
                    (0, socket_1.getIO)().to(renewal.tenantId).emit('booking_updated', { bookingId: renewal.bookingId });
                    cache_1.default.flushAll();
                }
            }
            catch (err) {
                console.error('Error auto-extending booking on lease renewal:', err);
            }
        }
        try {
            (0, socket_1.getIO)().to(renewal.tenantId).emit('lease_renewal_updated', updated);
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({
            message: `Lease renewal status updated to ${status}`,
            renewal: updated
        });
    }
    catch (error) {
        console.error('Error responding to lease renewal:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.respondLeaseRenewal = respondLeaseRenewal;
//# sourceMappingURL=leaseRenewal.controller.js.map