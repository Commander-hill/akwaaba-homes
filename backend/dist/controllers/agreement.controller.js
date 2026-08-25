"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAgreement = exports.getLandlordAgreements = exports.getTenantAgreements = exports.getAgreementByBooking = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const crypto_1 = __importDefault(require("crypto"));
const notification_service_1 = require("../utils/notification.service");
const socket_1 = require("../socket");
const getAgreementByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        let agreement = await prisma_1.default.leaseAgreement.findFirst({
            where: {
                OR: [
                    { bookingId },
                    { id: bookingId }
                ]
            },
            include: {
                booking: {
                    include: {
                        property: true,
                        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
                    }
                }
            }
        });
        // Auto-generate Lease Agreement if booking exists but agreement was not created yet
        if (!agreement) {
            const booking = await prisma_1.default.booking.findUnique({
                where: { id: bookingId },
                include: {
                    property: true,
                    tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
                }
            });
            if (booking) {
                agreement = await prisma_1.default.leaseAgreement.create({
                    data: {
                        bookingId: booking.id,
                        status: 'PENDING_TENANT'
                    },
                    include: {
                        booking: {
                            include: {
                                property: true,
                                tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
                            }
                        }
                    }
                });
            }
        }
        if (!agreement) {
            res.status(404).json({ message: 'Lease agreement not found for this booking' });
            return;
        }
        // Authorization check
        if (role === 'TENANT' && agreement.booking.tenantId !== userId) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        if (role === 'LANDLORD' && agreement.booking.property.landlordId !== userId) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        // Fetch landlord details
        const landlord = await prisma_1.default.user.findUnique({
            where: { id: agreement.booking.property.landlordId },
            select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
        });
        res.status(200).json({ agreement, landlord });
    }
    catch (error) {
        console.error('Error fetching agreement:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAgreementByBooking = getAgreementByBooking;
const getTenantAgreements = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        if (!tenantId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const agreements = await prisma_1.default.leaseAgreement.findMany({
            where: {
                booking: { tenantId }
            },
            include: {
                booking: {
                    include: {
                        property: {
                            include: {
                                landlord: {
                                    select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
                                }
                            }
                        },
                        room: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ agreements });
    }
    catch (error) {
        console.error('Error fetching tenant agreements:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantAgreements = getTenantAgreements;
const getLandlordAgreements = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        if (!landlordId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const agreements = await prisma_1.default.leaseAgreement.findMany({
            where: {
                booking: {
                    property: { landlordId }
                }
            },
            include: {
                booking: {
                    include: {
                        property: true,
                        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
                        room: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ agreements });
    }
    catch (error) {
        console.error('Error fetching landlord agreements:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordAgreements = getLandlordAgreements;
const signAgreement = async (req, res) => {
    try {
        console.log('--- signAgreement HIT! ---');
        const { bookingId } = req.params;
        const { signature } = req.body;
        const userId = req.user?.id;
        const role = req.user?.role;
        console.log('bookingId:', bookingId, 'userId:', userId, 'role:', role, 'signature length:', signature?.length);
        if (!userId || !signature) {
            res.status(400).json({ message: 'Missing user or signature data' });
            return;
        }
        const agreement = await prisma_1.default.leaseAgreement.findUnique({
            where: { bookingId },
            include: { booking: { include: { property: true } } }
        });
        if (!agreement) {
            res.status(404).json({ message: 'Agreement not found' });
            return;
        }
        let updateData = {};
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'UNKNOWN';
        const userAgent = req.headers['user-agent'] || 'UNKNOWN';
        const timestamp = new Date();
        if (role === 'TENANT') {
            if (agreement.booking.tenantId !== userId) {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
            updateData.tenantSignature = signature;
            updateData.tenantSignedAt = timestamp;
            updateData.tenantIpAddress = ipAddress;
            updateData.tenantUserAgent = userAgent;
            if (agreement.status === 'PENDING_TENANT') {
                updateData.status = 'PENDING_LANDLORD';
            }
            else if (agreement.landlordSignature) {
                updateData.status = 'COMPLETED';
            }
        }
        else if (role === 'LANDLORD') {
            if (agreement.booking.property.landlordId !== userId) {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
            updateData.landlordSignature = signature;
            updateData.landlordSignedAt = timestamp;
            updateData.landlordIpAddress = ipAddress;
            updateData.landlordUserAgent = userAgent;
            if (agreement.status === 'PENDING_LANDLORD') {
                updateData.status = 'COMPLETED';
            }
            else if (agreement.tenantSignature) {
                updateData.status = 'COMPLETED';
            }
        }
        if (updateData.status === 'COMPLETED') {
            const dataToHash = JSON.stringify({
                bookingId,
                tenantSignature: agreement.tenantSignature || updateData.tenantSignature,
                tenantSignedAt: agreement.tenantSignedAt || updateData.tenantSignedAt,
                tenantIpAddress: agreement.tenantIpAddress || updateData.tenantIpAddress,
                landlordSignature: agreement.landlordSignature || updateData.landlordSignature,
                landlordSignedAt: agreement.landlordSignedAt || updateData.landlordSignedAt,
                landlordIpAddress: agreement.landlordIpAddress || updateData.landlordIpAddress,
            });
            updateData.cryptographicHash = crypto_1.default.createHash('sha256').update(dataToHash).digest('hex');
        }
        const updatedAgreement = await prisma_1.default.leaseAgreement.update({
            where: { id: agreement.id },
            data: updateData,
            include: {
                booking: {
                    include: {
                        property: true,
                        tenant: { select: { id: true, firstName: true, lastName: true, email: true } }
                    }
                }
            }
        });
        // Real-time socket sync for lease agreements
        try {
            const io = (0, socket_1.getIO)();
            io.to(agreement.booking.tenantId).emit('agreement_updated', { agreement: updatedAgreement });
            io.to(agreement.booking.property.landlordId).emit('agreement_updated', { agreement: updatedAgreement });
        }
        catch (e) {
            console.error('Socket notification failed', e);
        }
        res.status(200).json({ message: 'Signature submitted successfully', agreement: updatedAgreement });
        // Send notifications if fully signed
        if (updateData.status === 'COMPLETED') {
            const landlord = await prisma_1.default.user.findUnique({ where: { id: agreement.booking.property.landlordId } });
            const tenant = await prisma_1.default.user.findUnique({ where: { id: agreement.booking.tenantId } });
            if (landlord && tenant) {
                await (0, notification_service_1.notifyAgreementCompleted)({
                    landlordEmail: landlord.email,
                    landlordName: `${landlord.firstName} ${landlord.lastName}`,
                    tenantEmail: tenant.email,
                    tenantName: `${tenant.firstName} ${tenant.lastName}`,
                    propertyTitle: agreement.booking.property.title,
                    bookingId: bookingId,
                    hash: updateData.cryptographicHash
                });
            }
        }
    }
    catch (error) {
        console.error('Error signing agreement:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.signAgreement = signAgreement;
//# sourceMappingURL=agreement.controller.js.map