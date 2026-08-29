"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLandlordDeed = exports.getLandlordDeedAudits = exports.resolveBreachReport = exports.getAdminBreachReports = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Fetch all contract breach reports for admin moderation
 */
const getAdminBreachReports = async (req, res) => {
    try {
        const { status } = req.query;
        const whereClause = {};
        if (status && typeof status === 'string') {
            whereClause.status = status;
        }
        const breaches = await prisma_1.default.breachReport.findMany({
            where: whereClause,
            include: {
                reporter: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phoneNumber: true,
                        role: true,
                        reputationScore: true
                    }
                },
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phoneNumber: true,
                        role: true,
                        reputationScore: true,
                        isSuspended: true
                    }
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        location: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ breaches });
    }
    catch (error) {
        console.error('Error fetching admin breach reports:', error);
        res.status(500).json({ message: 'Failed to fetch breach reports' });
    }
};
exports.getAdminBreachReports = getAdminBreachReports;
/**
 * Resolve Breach Report with Reputation Deduction & Account Actions
 */
const resolveBreachReport = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, penaltyDeduction, suspendAccount, adminNotes } = req.body;
        if (!['VERIFIED', 'REJECTED', 'DISMISSED'].includes(status)) {
            res.status(400).json({ message: 'Status must be VERIFIED, REJECTED, or DISMISSED' });
            return;
        }
        const breach = await prisma_1.default.breachReport.findUnique({
            where: { id },
            include: { tenant: true, reporter: true, property: true }
        });
        if (!breach) {
            res.status(404).json({ message: 'Breach report record not found' });
            return;
        }
        let updatedReputation = breach.tenant.reputationScore;
        let shouldSuspend = breach.tenant.isSuspended;
        if (status === 'VERIFIED') {
            // Calculate penalty deduction (default -1.0 if not provided)
            const deduction = penaltyDeduction ? Math.abs(parseFloat(penaltyDeduction)) : 1.0;
            updatedReputation = Math.max(0.0, parseFloat((breach.tenant.reputationScore - deduction).toFixed(1)));
            // Auto-suspend if reputation drops below 2.0 or admin specifically selected suspendAccount
            if (updatedReputation <= 2.0 || suspendAccount === true) {
                shouldSuspend = true;
            }
            // Update tenant reputation score & suspension state
            await prisma_1.default.user.update({
                where: { id: breach.tenantId },
                data: {
                    reputationScore: updatedReputation,
                    isSuspended: shouldSuspend
                }
            });
        }
        // Update Breach report status
        const updatedReport = await prisma_1.default.breachReport.update({
            where: { id },
            data: {
                status,
                penaltyApplied: status === 'VERIFIED'
            }
        });
        // Send notifications to both parties
        await prisma_1.default.notification.createMany({
            data: [
                {
                    userId: breach.tenantId,
                    type: 'ANNOUNCEMENT',
                    title: status === 'VERIFIED' ? '🚨 Contract Breach Upheld by Admin' : 'Breach Complaint Status Updated',
                    message: status === 'VERIFIED'
                        ? `Admin verified contract breach for "${breach.property.title}". Reputation updated to ${updatedReputation}/5.0.${shouldSuspend ? ' Account has been suspended.' : ''}`
                        : `Breach report for "${breach.property.title}" was marked as ${status.toLowerCase()}.`,
                    link: '/dashboard/tenant'
                },
                {
                    userId: breach.reporterId,
                    type: 'ANNOUNCEMENT',
                    title: '⚖️ Breach Dispute Verdict Issued',
                    message: `Admin issued verdict for your report on "${breach.property.title}": Status marked as ${status}.${adminNotes ? ` Note: ${adminNotes}` : ''}`,
                    link: '/dashboard/tenant'
                }
            ]
        });
        res.status(200).json({
            message: `Breach report resolved as ${status}`,
            breach: updatedReport,
            offenderReputation: updatedReputation,
            isSuspended: shouldSuspend
        });
    }
    catch (error) {
        console.error('Error resolving breach report:', error);
        res.status(500).json({ message: 'Failed to resolve breach report' });
    }
};
exports.resolveBreachReport = resolveBreachReport;
/**
 * Fetch Landlord Deed / Ownership Document Audits
 */
const getLandlordDeedAudits = async (req, res) => {
    try {
        const { status } = req.query;
        const whereClause = {
            role: 'LANDLORD'
        };
        if (status && typeof status === 'string') {
            whereClause.landlordVerificationStatus = status;
        }
        const landlords = await prisma_1.default.user.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                landlordDocUrl: true,
                isVerifiedLandlord: true,
                landlordVerificationStatus: true,
                reputationScore: true,
                createdAt: true,
                properties: {
                    select: {
                        id: true,
                        title: true,
                        location: true,
                        approvalStatus: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ landlords });
    }
    catch (error) {
        console.error('Error fetching landlord deed audits:', error);
        res.status(500).json({ message: 'Failed to fetch landlord deed audits' });
    }
};
exports.getLandlordDeedAudits = getLandlordDeedAudits;
/**
 * Audit Landlord Deed Document (Approve / Reject)
 */
const auditLandlordDeed = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, notes } = req.body; // VERIFIED or REJECTED
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            res.status(400).json({ message: 'Status must be VERIFIED or REJECTED' });
            return;
        }
        const landlord = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!landlord || landlord.role !== 'LANDLORD') {
            res.status(404).json({ message: 'Landlord record not found' });
            return;
        }
        const updated = await prisma_1.default.user.update({
            where: { id },
            data: {
                isVerifiedLandlord: status === 'VERIFIED',
                landlordVerificationStatus: status
            }
        });
        // Send notification
        await prisma_1.default.notification.create({
            data: {
                userId: id,
                type: 'ANNOUNCEMENT',
                title: status === 'VERIFIED' ? '🎉 Hostel Ownership Deed Verified!' : 'Landlord Deed Verification Update',
                message: status === 'VERIFIED'
                    ? 'Your ownership deed document has been approved! You now have Verified Landlord status on Akwaaba Homes.'
                    : `Deed verification rejected.${notes ? ` Reason: ${notes}` : ' Please re-upload a clear property ownership document.'}`,
                link: '/dashboard/landlord'
            }
        });
        res.status(200).json({
            message: `Landlord deed status updated to ${status}`,
            landlord: updated
        });
    }
    catch (error) {
        console.error('Error auditing landlord deed:', error);
        res.status(500).json({ message: 'Failed to audit landlord deed' });
    }
};
exports.auditLandlordDeed = auditLandlordDeed;
//# sourceMappingURL=adminBreach.controller.js.map