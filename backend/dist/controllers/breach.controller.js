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
        const report = await prisma_1.default.breachReport.create({
            data: {
                reporterId,
                tenantId,
                propertyId,
                title,
                description
            }
        });
        try {
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
        const report = await prisma_1.default.breachReport.findUnique({ where: { id }, include: { tenant: true } });
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
            try {
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
            try {
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