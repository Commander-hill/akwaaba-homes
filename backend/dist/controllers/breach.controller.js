"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBreach = exports.getBreachReports = exports.reportBreach = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("../utils/cache"));
const reportBreach = async (req, res) => {
    try {
        const reporterId = req.user.id;
        const { tenantId, propertyId, title, description } = req.body;
        if (!tenantId || !propertyId || !title || !description) {
            res.status(400).json({ message: 'tenantId, propertyId, title, and description are required' });
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
            where: { propertyId, userId: reporterId }
        });
        if (property.landlordId !== reporterId && req.user.role !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to report a breach on this property' });
            return;
        }
        const tenantBooking = await prisma_1.default.booking.findFirst({
            where: {
                propertyId,
                tenantId,
                status: { in: ['CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN', 'APPROVED'] }
            }
        });
        if (!tenantBooking && req.user.role !== 'ADMIN') {
            res.status(400).json({ message: 'Cannot report breach: This tenant does not have an active or confirmed tenancy record for this property.' });
            return;
        }
        const report = await prisma_1.default.breachReport.create({
            data: {
                reporterId,
                tenantId,
                propertyId,
                title,
                description
            }
        });
        // In-app alert to tenant
        await prisma_1.default.notification.create({
            data: {
                userId: tenantId,
                type: 'SYSTEM_ALERT',
                title: '⚠️ Contract Breach Report Logged',
                message: `A breach report "${title}" was logged regarding your tenancy at ${property.title}. Akwaaba Homes admin will review this matter.`,
                link: '/dashboard/tenant'
            }
        }).catch(() => { });
        try {
            (0, socket_1.getIO)().to(tenantId).emit('notification', {
                title: '⚠️ Contract Breach Report Logged',
                message: `A breach report "${title}" was logged for ${property.title}.`,
                type: 'SYSTEM_ALERT'
            });
            (0, socket_1.getIO)().emit('breach_updated', report);
            cache_1.default.flushAll();
        }
        catch (e) { }
        res.status(201).json({ message: 'Breach reported successfully, pending verification.', report });
    }
    catch (error) {
        console.error('Error reporting breach:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.reportBreach = reportBreach;
const getBreachReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        let reports;
        if (role === 'LANDLORD') {
            reports = await prisma_1.default.breachReport.findMany({ where: { reporterId: userId }, include: { tenant: { select: { firstName: true, lastName: true, email: true } }, property: { select: { title: true } } } });
        }
        else if (role === 'TENANT') {
            reports = await prisma_1.default.breachReport.findMany({ where: { tenantId: userId }, include: { reporter: { select: { firstName: true, lastName: true } }, property: { select: { title: true } } } });
        }
        else if (role === 'ADMIN') {
            reports = await prisma_1.default.breachReport.findMany({ include: { tenant: true, reporter: true, property: true } });
        }
        else {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        res.status(200).json({ reports });
    }
    catch (error) {
        console.error('Error fetching breach reports:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getBreachReports = getBreachReports;
const verifyBreach = async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body; // VERIFIED or REJECTED
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status. Must be VERIFIED or REJECTED' });
            return;
        }
        const report = await prisma_1.default.breachReport.findUnique({
            where: { id },
            include: { tenant: true, property: true }
        });
        if (!report) {
            res.status(404).json({ message: 'Breach report not found' });
            return;
        }
        if (report.status !== 'PENDING') {
            res.status(400).json({ message: 'Breach report is already processed' });
            return;
        }
        // Apply penalty if VERIFIED
        if (status === 'VERIFIED') {
            const newScore = Math.max(1.0, report.tenant.reputationScore - 1.0);
            const isSuspended = newScore < 2.0;
            await prisma_1.default.$transaction([
                prisma_1.default.breachReport.update({
                    where: { id },
                    data: { status: 'VERIFIED', penaltyApplied: true }
                }),
                prisma_1.default.user.update({
                    where: { id: report.tenantId },
                    data: { reputationScore: newScore, isSuspended }
                })
            ]);
            // Notify both parties
            await prisma_1.default.notification.createMany({
                data: [
                    {
                        userId: report.tenantId,
                        type: 'SYSTEM_ALERT',
                        title: '🚨 Contract Breach Verified by Admin',
                        message: `Admin verified the contract breach report for "${report.property?.title || 'your tenancy'}". Reputation score updated to ${newScore}/5.0.${isSuspended ? ' Account has been suspended.' : ''}`,
                        link: '/dashboard/tenant'
                    },
                    {
                        userId: report.reporterId,
                        type: 'ANNOUNCEMENT',
                        title: '⚖️ Breach Dispute Verdict Issued',
                        message: `Admin verified your breach report for "${report.property?.title || 'property'}". Penalty has been applied.`,
                        link: '/dashboard/landlord'
                    }
                ]
            }).catch(() => { });
            try {
                (0, socket_1.getIO)().to(report.tenantId).emit('notification', {
                    title: '🚨 Contract Breach Verified',
                    message: `Admin upheld the contract breach report.`,
                    type: 'SYSTEM_ALERT'
                });
                (0, socket_1.getIO)().to(report.reporterId).emit('notification', {
                    title: '⚖️ Breach Verdict Issued',
                    message: `Your breach report was verified by admin.`,
                    type: 'ANNOUNCEMENT'
                });
                (0, socket_1.getIO)().emit('breach_updated', { id, status: 'VERIFIED' });
                (0, socket_1.getIO)().emit('user_updated', { userId: report.tenantId });
                cache_1.default.flushAll();
            }
            catch (e) { }
            res.status(200).json({ message: 'Breach verified and penalty applied.', newScore, isSuspended });
            return;
        }
        else {
            const updatedReport = await prisma_1.default.breachReport.update({
                where: { id: id },
                data: { status: 'REJECTED' }
            });
            await prisma_1.default.notification.create({
                data: {
                    userId: report.reporterId,
                    type: 'ANNOUNCEMENT',
                    title: '⚖️ Breach Report Dismissed',
                    message: `Admin reviewed and dismissed the breach report for "${report.property?.title || 'property'}".`,
                    link: '/dashboard/landlord'
                }
            }).catch(() => { });
            try {
                (0, socket_1.getIO)().to(report.reporterId).emit('notification', {
                    title: '⚖️ Breach Report Dismissed',
                    message: `Your breach report was reviewed and dismissed by admin.`,
                    type: 'ANNOUNCEMENT'
                });
                (0, socket_1.getIO)().emit('breach_updated', { id, status: 'REJECTED' });
                cache_1.default.flushAll();
            }
            catch (e) { }
            res.status(200).json({ message: 'Breach rejected.', report: updatedReport });
            return;
        }
    }
    catch (error) {
        console.error('Error verifying breach:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.verifyBreach = verifyBreach;
//# sourceMappingURL=breach.controller.js.map