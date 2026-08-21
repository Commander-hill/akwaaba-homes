"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAgreement = exports.getAgreementByBooking = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getAgreementByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const agreement = await prisma_1.default.leaseAgreement.findUnique({
            where: { bookingId },
            include: {
                booking: {
                    include: {
                        property: true,
                        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
                    }
                }
            }
        });
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
const signAgreement = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { signature } = req.body;
        const userId = req.user?.id;
        const role = req.user?.role;
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
        if (role === 'TENANT') {
            if (agreement.booking.tenantId !== userId) {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
            updateData.tenantSignature = signature;
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
            if (agreement.status === 'PENDING_LANDLORD') {
                updateData.status = 'COMPLETED'; // assuming tenant signs first typically, but flexible
            }
            else if (agreement.tenantSignature) {
                updateData.status = 'COMPLETED';
            }
        }
        const updatedAgreement = await prisma_1.default.leaseAgreement.update({
            where: { id: agreement.id },
            data: updateData
        });
        res.status(200).json({ message: 'Signature submitted successfully', agreement: updatedAgreement });
    }
    catch (error) {
        console.error('Error signing agreement:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.signAgreement = signAgreement;
//# sourceMappingURL=agreement.controller.js.map