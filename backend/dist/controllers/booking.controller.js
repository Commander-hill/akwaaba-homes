"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.payBooking = exports.updateBookingStatus = exports.getLandlordBookings = exports.getTenantBookings = exports.createBooking = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const notification_service_1 = require("../utils/notification.service");
const socket_1 = require("../socket");
const json_1 = require("../utils/json");
const createBooking = async (req, res) => {
    try {
        const tenantId = req.user.id;
        const { propertyId, roomId, startDate, endDate } = req.body;
        if (!propertyId || !roomId || !startDate || !endDate) {
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
        const room = await prisma_1.default.room.findUnique({ where: { id: roomId } });
        if (!room || room.propertyId !== propertyId) {
            res.status(400).json({ message: 'Invalid room selected' });
            return;
        }
        // We do not check property.isAvailable as strictly here, we'll rely on room availability during payment,
        // but we can still check it.
        if (!property.isAvailable) {
            res.status(400).json({ message: 'Property is currently not available for booking' });
            return;
        }
        const tenant = await prisma_1.default.user.findUnique({
            where: { id: tenantId },
            select: {
                firstName: true, lastName: true, email: true, phoneNumber: true,
                gender: true, dateOfBirth: true, nationality: true, guardianName: true,
                guardianPhone: true, campus: true, studentId: true, dateOfAdmission: true,
                programmeOfStudy: true, yearOfStudy: true, studentType: true,
                ghanaCardStatus: true, ghanaCardNumber: true
            }
        });
        // ── STRICT PROFILE COMPLETENESS VALIDATION ──
        const missingFields = [];
        if (!tenant?.firstName?.trim())
            missingFields.push('First Name');
        if (!tenant?.lastName?.trim())
            missingFields.push('Last Name');
        if (!tenant?.phoneNumber?.trim())
            missingFields.push('Phone Number');
        if (!tenant?.gender?.trim())
            missingFields.push('Gender');
        if (!tenant?.dateOfBirth?.trim())
            missingFields.push('Date of Birth');
        if (!tenant?.nationality?.trim())
            missingFields.push('Country / Nationality');
        if (!tenant?.guardianName?.trim())
            missingFields.push('Guardian Name');
        if (!tenant?.guardianPhone?.trim())
            missingFields.push('Guardian Phone');
        if (!tenant?.campus?.trim())
            missingFields.push('Campus');
        if (!tenant?.studentId?.trim())
            missingFields.push('Student ID');
        if (!tenant?.dateOfAdmission?.trim())
            missingFields.push('Date of Admission');
        if (!tenant?.programmeOfStudy?.trim())
            missingFields.push('Programme of Study');
        if (!tenant?.yearOfStudy?.trim())
            missingFields.push('Year of Study');
        if (!tenant?.studentType?.trim())
            missingFields.push('Student Type');
        if (missingFields.length > 0) {
            res.status(403).json({
                message: `Profile Incomplete: You must complete all required profile details before requesting a booking. Missing: ${missingFields.join(', ')}.`,
                redirectTo: '/dashboard/profile'
            });
            return;
        }
        // ── STRICT IDENTITY VERIFICATION VALIDATION ──
        if (!tenant?.ghanaCardStatus || tenant.ghanaCardStatus === 'NOT_SUBMITTED') {
            res.status(403).json({
                message: 'Identity Verification Required: You must submit your Ghana Card details on the Verification page before requesting a booking.',
                redirectTo: '/dashboard/verification'
            });
            return;
        }
        // ── GENDER BLOCK VALIDATION (Model 1: Block/Wing Level Segregation) ──
        // Only enforce if the room has a strict gender designation (MALE or FEMALE)
        if (room.gender !== 'MIXED') {
            const tenantGender = tenant?.gender?.toUpperCase(); // e.g. "MALE" or "FEMALE"
            if (!tenantGender) {
                res.status(403).json({
                    message: 'Your gender is not set on your profile. Please update your profile before booking a gender-designated block.',
                    redirectTo: '/dashboard/profile'
                });
                return;
            }
            if (tenantGender !== room.gender) {
                const blockLabel = room.blockName ? `"${room.blockName}"` : 'this block';
                res.status(403).json({
                    message: `Booking Rejected: ${blockLabel} is designated for ${room.gender === 'MALE' ? 'Male' : 'Female'} students only. Please select an appropriate block for your gender.`
                });
                return;
            }
        }
        const booking = await prisma_1.default.booking.create({
            data: { tenantId, propertyId, roomId, startDate: new Date(startDate), endDate: new Date(endDate), status: 'PENDING' },
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
        // Notify tenant with payment receipt
        if (tenant?.email) {
            await (0, notification_service_1.notifyPaymentReceipt)({
                tenantId,
                tenantEmail: tenant.email,
                tenantName: `${tenant.firstName} ${tenant.lastName}`,
                propertyTitle: property.title,
                amount: room.price,
                bookingId: booking.id
            });
        }
        // Real-time notification to landlord
        try {
            const io = (0, socket_1.getIO)();
            io.to(property.landlordId).emit('notification', {
                title: 'New Booking Request',
                message: `${tenant?.firstName} ${tenant?.lastName} requested to book ${property.title}.`,
                type: 'booking'
            });
            io.to(property.landlordId).emit('booking_created', { booking });
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
                property: { select: { title: true, location: true, price: true, images: true } },
                leaseAgreement: { select: { status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const parsedBookings = bookings.map(b => ({
            ...b,
            property: { ...b.property, images: (0, json_1.safeJsonParse)(b.property.images, []) }
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
                tenant: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, reputationScore: true, avatarUrl: true, gender: true, studentId: true, programmeOfStudy: true } }
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
            // Real-time notification to tenant & landlord status sync
            try {
                const io = (0, socket_1.getIO)();
                io.to(booking.tenant.id).emit('notification', {
                    title: `Booking ${status}`,
                    message: `Your booking for ${booking.property.title} was ${status.toLowerCase()}.`,
                    type: 'booking'
                });
                io.to(booking.tenant.id).emit('booking_updated', { booking: updatedBooking });
                io.to(booking.property.landlordId).emit('booking_updated', { booking: updatedBooking });
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
const payBooking = async (req, res) => {
    try {
        const tenantId = req.user.id;
        const { id } = req.params;
        const booking = await prisma_1.default.booking.findUnique({
            where: { id },
            include: { property: true, room: true, tenant: { select: { firstName: true, lastName: true, email: true } }, leaseAgreement: true }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        if (booking.tenantId !== tenantId) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        if (booking.status !== 'APPROVED') {
            res.status(400).json({ message: 'Booking must be approved before payment' });
            return;
        }
        if (!booking.leaseAgreement || booking.leaseAgreement.status !== 'COMPLETED') {
            res.status(400).json({ message: 'Both Tenant and Landlord must sign the Tenancy Agreement before payment can be processed.' });
            return;
        }
        // Capacity Check Loophole Fix
        if (!booking.room) {
            res.status(400).json({ message: 'Invalid booking data (missing room)' });
            return;
        }
        const completedBookingsCount = await prisma_1.default.booking.count({
            where: {
                roomId: booking.roomId,
                status: 'COMPLETED'
            }
        });
        if (completedBookingsCount >= booking.room.numberOfRooms * booking.room.bedsPerRoom) {
            res.status(400).json({ message: 'This room type has reached its maximum capacity and is no longer available for payment.' });
            return;
        }
        const paystackRes = await axios_1.default.post('https://api.paystack.co/transaction/initialize', {
            email: booking.tenant.email,
            amount: Math.round(booking.room.price * 100), // GHS to pesewas
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/tenant?verify=${booking.id}`,
            metadata: { bookingId: booking.id, tenantId: booking.tenantId }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        res.status(200).json({ authorization_url: paystackRes.data.data.authorization_url, reference: paystackRes.data.data.reference });
    }
    catch (error) {
        console.error('Error initializing payment:', error.response?.data || error);
        res.status(500).json({ message: 'Internal server error during Paystack initialization' });
    }
};
exports.payBooking = payBooking;
const verifyPayment = async (req, res) => {
    try {
        const tenantId = req.user.id;
        const { id } = req.params;
        const { reference } = req.body;
        if (!reference) {
            res.status(400).json({ message: 'Payment reference is required' });
            return;
        }
        const booking = await prisma_1.default.booking.findUnique({
            where: { id },
            include: { property: true, room: true, tenant: { select: { firstName: true, lastName: true, email: true } } }
        });
        if (!booking || booking.tenantId !== tenantId) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        if (booking.status === 'COMPLETED') {
            res.status(200).json({ message: 'Booking is already paid', booking });
            return;
        }
        const verifyRes = await axios_1.default.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });
        if (verifyRes.data.data.status !== 'success') {
            res.status(400).json({ message: 'Payment verification failed' });
            return;
        }
        const [updatedBooking, transaction] = await prisma_1.default.$transaction([
            prisma_1.default.booking.update({
                where: { id },
                data: { status: 'COMPLETED' }
            }),
            prisma_1.default.transaction.create({
                data: {
                    bookingId: booking.id,
                    tenantId: booking.tenantId,
                    landlordId: booking.property.landlordId,
                    propertyId: booking.propertyId,
                    roomId: booking.roomId,
                    amount: booking.room.price,
                    reference: reference,
                    status: 'SUCCESS'
                }
            })
        ]);
        // Recalibrate Capacity and Close Loophole
        if (booking.roomId && booking.room) {
            const completedBookings = await prisma_1.default.booking.count({
                where: {
                    roomId: booking.roomId,
                    status: 'COMPLETED'
                }
            });
            if (completedBookings >= booking.room.numberOfRooms * booking.room.bedsPerRoom) {
                // Auto-reject any remaining pending or approved bookings for THIS room
                await prisma_1.default.booking.updateMany({
                    where: {
                        roomId: booking.roomId,
                        id: { not: booking.id },
                        status: { in: ['PENDING', 'APPROVED'] }
                    },
                    data: { status: 'REJECTED' }
                });
            }
        }
        await (0, notification_service_1.notifyBookingStatusChanged)({
            tenantId: booking.tenantId,
            tenantEmail: booking.tenant.email,
            tenantName: `${booking.tenant.firstName} ${booking.tenant.lastName}`,
            propertyTitle: booking.property.title,
            status: 'COMPLETED'
        });
        await (0, notification_service_1.notifyPaymentReceipt)({
            tenantId: booking.tenantId,
            tenantEmail: booking.tenant.email,
            tenantName: `${booking.tenant.firstName} ${booking.tenant.lastName}`,
            propertyTitle: booking.property.title,
            amount: verifyRes.data.data.amount / 100,
            bookingId: booking.id
        });
        res.status(200).json({ message: 'Payment verified and booking completed', booking: updatedBooking });
    }
    catch (error) {
        console.error('Error verifying payment:', error.response?.data || error);
        res.status(500).json({ message: 'Internal server error during payment verification' });
    }
};
exports.verifyPayment = verifyPayment;
//# sourceMappingURL=booking.controller.js.map