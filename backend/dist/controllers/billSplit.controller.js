"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleParticipantPaidStatus = exports.getTenantBillSplits = exports.createBillSplit = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
/**
 * Create a new bill split
 */
const createBillSplit = async (req, res) => {
    try {
        const creatorId = req.user?.id;
        const { propertyId, title, category, totalAmount, dueDate, notes, participants } = req.body;
        if (!propertyId || !title || !totalAmount || !participants || !participants.length) {
            res.status(400).json({ message: 'Property ID, title, total amount, and at least one roommate participant are required' });
            return;
        }
        const total = parseFloat(totalAmount);
        const billSplit = await prisma_1.default.billSplit.create({
            data: {
                creatorId,
                propertyId,
                title: title.trim(),
                category: category || 'ELECTRICITY_ECG',
                totalAmount: total,
                dueDate: dueDate ? new Date(dueDate) : null,
                notes: notes || null,
                status: 'OPEN',
                participants: {
                    create: participants.map((p) => ({
                        userId: p.userId || null,
                        userName: p.userName.trim(),
                        userPhone: p.userPhone ? p.userPhone.trim() : null,
                        userEmail: p.userEmail ? p.userEmail.trim() : null,
                        shareAmount: parseFloat(p.shareAmount || (total / (participants.length + 1)).toFixed(2)),
                        isPaid: Boolean(p.isPaid)
                    }))
                }
            },
            include: {
                property: { select: { id: true, title: true, location: true } },
                participants: true
            }
        });
        try {
            (0, socket_1.getIO)().to(creatorId).emit('bill_split_created', billSplit);
        }
        catch (e) { /* non-blocking */ }
        res.status(201).json({
            message: 'Bill split created! Roommates can now settle their share.',
            billSplit
        });
    }
    catch (error) {
        console.error('Error creating bill split:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createBillSplit = createBillSplit;
/**
 * Get tenant's bill splits (created or participated)
 */
const getTenantBillSplits = async (req, res) => {
    try {
        const userId = req.user?.id;
        const billSplits = await prisma_1.default.billSplit.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { participants: { some: { userId } } }
                ]
            },
            include: {
                property: { select: { id: true, title: true, location: true } },
                participants: true,
                creator: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ billSplits });
    }
    catch (error) {
        console.error('Error fetching bill splits:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantBillSplits = getTenantBillSplits;
/**
 * Toggle or mark a participant share as paid
 */
const toggleParticipantPaidStatus = async (req, res) => {
    try {
        const { participantId } = req.params;
        const { isPaid } = req.body;
        const participant = await prisma_1.default.billSplitParticipant.findUnique({
            where: { id: participantId },
            include: { billSplit: { include: { participants: true } } }
        });
        if (!participant) {
            res.status(404).json({ message: 'Participant record not found' });
            return;
        }
        const updatedParticipant = await prisma_1.default.billSplitParticipant.update({
            where: { id: participantId },
            data: {
                isPaid: Boolean(isPaid),
                paidAt: isPaid ? new Date() : null
            }
        });
        // Check if all participants have paid to auto-settle the bill
        const allPaid = participant.billSplit.participants.every(p => p.id === participantId ? isPaid : p.isPaid);
        if (allPaid) {
            await prisma_1.default.billSplit.update({
                where: { id: participant.billSplitId },
                data: { status: 'SETTLED' }
            });
        }
        else {
            await prisma_1.default.billSplit.update({
                where: { id: participant.billSplitId },
                data: { status: 'OPEN' }
            });
        }
        res.status(200).json({
            message: isPaid ? 'Marked as settled ✅' : 'Marked as pending',
            participant: updatedParticipant
        });
    }
    catch (error) {
        console.error('Error updating participant payment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.toggleParticipantPaidStatus = toggleParticipantPaidStatus;
//# sourceMappingURL=billSplit.controller.js.map