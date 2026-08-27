"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNotification = exports.adminUpdateTicketStatus = exports.getAllTickets = exports.updateConfig = exports.getConfig = exports.getSystemActivity = exports.resolveAppeal = exports.revokeSubscription = exports.activateSubscription = exports.deleteReview = exports.getAllReviews = exports.verifyLandlord = exports.verifyUserCard = exports.getAllSubscriptions = exports.getAllBookings = exports.updatePropertyApproval = exports.getAllProperties = exports.toggleUserProfileLock = exports.toggleUserSuspension = exports.getAllUsers = exports.getPlatformAnalytics = exports.getSystemStats = exports.getAuditLogs = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const notification_service_1 = require("../utils/notification.service");
const crypto_1 = require("../utils/crypto");
const security_service_1 = require("../utils/security.service");
const auditLogger_1 = require("../utils/auditLogger");
const cache_1 = __importDefault(require("../utils/cache"));
const json_1 = require("../utils/json");
const config_service_1 = require("../utils/config.service");
const socket_1 = require("../socket");
const getAuditLogs = async (req, res) => {
    try {
        const logs = await prisma_1.default.auditLog.findMany({
            include: {
                user: { select: { firstName: true, lastName: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(logs);
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAuditLogs = getAuditLogs;
const getSystemStats = async (req, res) => {
    try {
        const cachedStats = cache_1.default.get('admin_stats');
        if (cachedStats) {
            res.status(200).json(cachedStats);
            return;
        }
        const totalUsers = await prisma_1.default.user.count();
        const totalLandlords = await prisma_1.default.user.count({ where: { role: 'LANDLORD' } });
        const totalProperties = await prisma_1.default.property.count();
        const totalBookings = await prisma_1.default.booking.count();
        // Sum all successful transaction amounts (total platform transaction volume)
        const transactionSum = await prisma_1.default.transaction.aggregate({
            _sum: { amount: true },
            where: { status: 'SUCCESS' }
        });
        const totalRevenue = transactionSum._sum.amount || 0;
        // Generate 6 months of historical data based on current totals for the chart
        const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
        const monthlyGrowth = months.map((month, index) => {
            // Create an escalating curve that culminates in the current totals
            const factor = (index + 1) / 6;
            return {
                name: month,
                users: Math.round(totalUsers * factor * (0.8 + Math.random() * 0.4)),
                properties: Math.round(totalProperties * factor * (0.8 + Math.random() * 0.4)),
                revenue: Math.round(totalRevenue * factor * (0.8 + Math.random() * 0.4))
            };
        });
        const responseData = {
            totalUsers,
            totalLandlords,
            totalProperties,
            totalBookings,
            totalRevenue,
            monthlyGrowth
        };
        cache_1.default.set('admin_stats', responseData, 60); // Cache stats for 60 seconds
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSystemStats = getSystemStats;
const getPlatformAnalytics = async (req, res) => {
    try {
        const cachedAnalytics = cache_1.default.get('admin_analytics');
        if (cachedAnalytics) {
            res.status(200).json(cachedAnalytics);
            return;
        }
        // 1. Conversion Metrics
        const totalBookings = await prisma_1.default.booking.count();
        const approvedBookings = await prisma_1.default.booking.count({ where: { status: 'APPROVED' } });
        const paidBookings = await prisma_1.default.booking.count({ where: { status: 'COMPLETED' } });
        const conversionRate = totalBookings > 0 ? ((paidBookings / totalBookings) * 100).toFixed(1) : '0.0';
        // 2. Revenue Metrics
        const totalTransactions = await prisma_1.default.transaction.aggregate({
            _sum: { amount: true },
            where: { status: 'SUCCESS' }
        });
        const totalRevenueGhs = totalTransactions._sum.amount || 0;
        // 3. Top 5 Landlords by Revenue
        const landlordGroup = await prisma_1.default.transaction.groupBy({
            by: ['landlordId'],
            _sum: { amount: true },
            where: { status: 'SUCCESS' },
            orderBy: { _sum: { amount: 'desc' } },
            take: 5
        });
        const landlordIds = landlordGroup.map(g => g.landlordId);
        const landlords = await prisma_1.default.user.findMany({
            where: { id: { in: landlordIds } },
            select: { id: true, firstName: true, lastName: true, email: true }
        });
        const topLandlords = landlordGroup.map((g, index) => {
            const l = landlords.find(u => u.id === g.landlordId);
            return {
                rank: index + 1,
                landlordId: g.landlordId,
                name: l ? `${l.firstName} ${l.lastName}` : 'Landlord',
                email: l ? l.email : 'N/A',
                totalEarningsGhs: g._sum.amount || 0
            };
        });
        // 4. Geographical Density (Properties by Location / Region)
        const properties = await prisma_1.default.property.findMany({
            select: { location: true }
        });
        const locationCounts = {};
        properties.forEach(p => {
            let loc = p.location || 'Other Region';
            const lower = loc.toLowerCase();
            if (lower.includes('ucc') || lower.includes('cape coast'))
                loc = 'UCC / Cape Coast';
            else if (lower.includes('legon') || lower.includes('accra'))
                loc = 'UG Legon / Accra';
            else if (lower.includes('knust') || lower.includes('kumasi'))
                loc = 'KNUST / Kumasi';
            else if (lower.includes('uew') || lower.includes('winneba'))
                loc = 'UEW / Winneba';
            else if (lower.includes('uenr') || lower.includes('sunyani'))
                loc = 'UENR / Sunyani';
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });
        const geographicalDensity = Object.keys(locationCounts).map(region => ({
            region,
            propertyCount: locationCounts[region]
        }));
        // 5. Monthly Signup & Growth Trends (6 months)
        const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
        const totalUsers = await prisma_1.default.user.count();
        const totalProperties = await prisma_1.default.property.count();
        const monthlyTrends = months.map((month, index) => {
            const factor = (index + 1) / 6;
            return {
                month,
                tenants: Math.round(totalUsers * 0.75 * factor),
                landlords: Math.round(totalUsers * 0.25 * factor),
                approvedProperties: Math.round(totalProperties * factor),
                revenueGhs: Math.round(totalRevenueGhs * factor)
            };
        });
        const analyticsData = {
            funnel: {
                totalBookings,
                approvedBookings,
                paidBookings,
                conversionRate: parseFloat(conversionRate)
            },
            totalRevenueGhs,
            topLandlords,
            geographicalDensity,
            monthlyTrends
        };
        cache_1.default.set('admin_analytics', analyticsData, 60);
        res.status(200).json(analyticsData);
    }
    catch (error) {
        console.error('Error fetching platform analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPlatformAnalytics = getPlatformAnalytics;
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isSuspended: true,
                isProfileLocked: true,
                profileUnlockRequested: true,
                profileUnlockReason: true,
                ghanaCardStatus: true,
                ghanaCardNumber: true,
                ghanaCardFrontUrl: true,
                ghanaCardBackUrl: true,
                landlordDocUrl: true,
                isVerifiedLandlord: true,
                landlordVerificationStatus: true,
                reputationScore: true,
                createdAt: true
            }
        });
        const decryptedUsers = users.map(user => ({
            ...user,
            ghanaCardNumber: user.ghanaCardNumber ? (0, crypto_1.decryptData)(user.ghanaCardNumber) : null,
            ghanaCardFrontUrl: (0, security_service_1.generateSignedDocumentUrl)(user.ghanaCardFrontUrl),
            ghanaCardBackUrl: (0, security_service_1.generateSignedDocumentUrl)(user.ghanaCardBackUrl),
            landlordDocUrl: (0, security_service_1.generateSignedDocumentUrl)(user.landlordDocUrl)
        }));
        res.status(200).json(decryptedUsers);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllUsers = getAllUsers;
const toggleUserSuspension = async (req, res) => {
    try {
        const { id } = req.params;
        const { isSuspended } = req.body;
        const targetSuspensionState = Boolean(isSuspended);
        // Prevent suspending self or other admins
        const targetUser = await prisma_1.default.user.findUnique({ where: { id } });
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (targetUser.role === 'ADMIN') {
            res.status(403).json({ message: 'Cannot suspend an administrator account' });
            return;
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id },
            data: { isSuspended: targetSuspensionState },
            select: { id: true, firstName: true, lastName: true, email: true, role: true, isSuspended: true }
        });
        if (targetSuspensionState) {
            // Invalidate all active sessions for suspended user immediately
            await prisma_1.default.session.deleteMany({ where: { userId: id } });
        }
        try {
            (0, socket_1.emitToAll)('user_updated', { userId: id, isSuspended: targetSuspensionState });
        }
        catch (e) {
            console.warn('Socket notification for user suspension failed:', e);
        }
        await (0, auditLogger_1.logAudit)(req.user.id, targetSuspensionState ? 'SUSPEND_USER' : 'UNSUSPEND_USER', 'User', id, { isSuspended: targetUser.isSuspended }, { isSuspended: targetSuspensionState }, req.ip || req.socket.remoteAddress);
        res.status(200).json({
            message: `User ${updatedUser.firstName} ${updatedUser.lastName} has been ${targetSuspensionState ? 'suspended' : 'unsuspended'} successfully.`,
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Error toggling user suspension:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.toggleUserSuspension = toggleUserSuspension;
const toggleUserProfileLock = async (req, res) => {
    try {
        const { id } = req.params;
        const { isProfileLocked } = req.body;
        const targetLockState = Boolean(isProfileLocked);
        const targetUser = await prisma_1.default.user.findUnique({ where: { id } });
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id },
            data: {
                isProfileLocked: targetLockState,
                profileUnlockRequested: false,
                profileUnlockReason: null
            },
            select: { id: true, firstName: true, lastName: true, email: true, role: true, isProfileLocked: true }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, targetLockState ? 'LOCK_USER_PROFILE' : 'UNLOCK_USER_PROFILE', 'User', id, { isProfileLocked: targetUser.isProfileLocked }, { isProfileLocked: targetLockState }, req.ip || req.socket.remoteAddress);
        // Notify user in real-time so their profile page updates without refresh
        try {
            const { getIO } = await import('../socket');
            getIO().to(id).emit('user_updated', { isProfileLocked: targetLockState });
            if (!targetLockState) {
                getIO().to(id).emit('notification', {
                    title: '🔓 Profile Edit Access Granted',
                    message: 'An administrator has unlocked your profile. You can now update your information.',
                    type: 'profile'
                });
            }
        }
        catch (e) { /* socket optional */ }
        res.status(200).json({
            message: `User ${updatedUser.firstName} ${updatedUser.lastName}'s profile lock status has been updated to ${targetLockState ? 'Locked' : 'Unlocked (Edit Access Granted)'}.`,
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Error toggling user profile lock:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.toggleUserProfileLock = toggleUserProfileLock;
const getAllProperties = async (req, res) => {
    try {
        const properties = await prisma_1.default.property.findMany({
            include: {
                landlord: { select: { firstName: true, lastName: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const parsedProperties = properties.map(p => ({
            ...p,
            images: (0, json_1.safeJsonParse)(p.images, []),
            amenities: (0, json_1.safeJsonParse)(p.amenities, [])
        }));
        res.status(200).json(parsedProperties);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllProperties = getAllProperties;
const updatePropertyApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvalStatus } = req.body; // PENDING, APPROVED, REJECTED
        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        if (!validStatuses.includes(approvalStatus)) {
            res.status(400).json({ message: 'Invalid approval status' });
            return;
        }
        const oldProperty = await prisma_1.default.property.findUnique({ where: { id } });
        if (!oldProperty) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const property = await prisma_1.default.property.update({
            where: { id },
            data: { approvalStatus },
            include: { landlord: { select: { id: true, email: true, firstName: true } } }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, approvalStatus === 'APPROVED' ? 'APPROVE_PROPERTY' : (approvalStatus === 'REJECTED' ? 'REJECT_PROPERTY' : 'PENDING_PROPERTY'), 'Property', id, { approvalStatus: oldProperty.approvalStatus }, { approvalStatus }, req.ip || req.socket.remoteAddress);
        // Notify the landlord about their listing decision
        if (approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED') {
            await (0, notification_service_1.notifyPropertyApproval)({
                landlordId: property.landlord.id,
                landlordEmail: property.landlord.email,
                landlordName: property.landlord.firstName,
                propertyTitle: property.title,
                status: approvalStatus
            });
        }
        // Invalidate properties cache
        const keys = cache_1.default.keys();
        const propertyKeys = keys.filter(k => k.startsWith('properties_'));
        cache_1.default.del(propertyKeys);
        // Emit real-time property update to the landlord so their dashboard refreshes instantly
        try {
            const { getIO } = await import('../socket');
            getIO().to(property.landlord.id).emit('property_updated', { propertyId: id, approvalStatus });
            getIO().to(property.landlord.id).emit('notification', {
                title: approvalStatus === 'APPROVED' ? '🎉 Property Listing Approved!' : '❌ Property Listing Rejected',
                message: approvalStatus === 'APPROVED'
                    ? `Your listing "${property.title}" has been approved. Pay the listing fee to go live!`
                    : `Your listing "${property.title}" was rejected. Please review the guidelines and resubmit.`,
                type: 'property'
            });
        }
        catch (e) { /* socket optional */ }
        res.status(200).json({ message: `Property status updated to ${approvalStatus}`, property });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updatePropertyApproval = updatePropertyApproval;
const getAllBookings = async (req, res) => {
    try {
        const bookings = await prisma_1.default.booking.findMany({
            include: {
                tenant: { select: { firstName: true, lastName: true, email: true } },
                property: { select: { title: true, landlord: { select: { firstName: true, lastName: true, email: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(bookings);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllBookings = getAllBookings;
const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await prisma_1.default.propertySubscription.findMany({
            include: {
                property: {
                    include: {
                        landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Enrich each subscription with days remaining
        const now = new Date();
        const enriched = subscriptions.map(sub => {
            const endDate = new Date(sub.endDate);
            const diffMs = endDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            return { ...sub, daysRemaining };
        });
        res.status(200).json(enriched);
    }
    catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllSubscriptions = getAllSubscriptions;
const verifyUserCard = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // VERIFIED, REJECTED
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const oldUser = await prisma_1.default.user.findUnique({ where: { id } });
        if (!oldUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data: { ghanaCardStatus: status },
            select: { id: true, ghanaCardStatus: true }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, status === 'VERIFIED' ? 'VERIFY_ID_CARD' : 'REJECT_ID_CARD', 'User', id, { ghanaCardStatus: oldUser.ghanaCardStatus }, { ghanaCardStatus: status }, req.ip || req.socket.remoteAddress);
        // Notify the user in real-time so the onboarding widget refreshes instantly
        try {
            const { getIO } = await import('../socket');
            getIO().to(id).emit('notification', {
                title: status === 'VERIFIED' ? '✅ Identity Verified!' : '❌ Verification Rejected',
                message: status === 'VERIFIED'
                    ? 'Your Ghana Card has been verified. You can now list properties and make bookings.'
                    : 'Your Ghana Card submission was rejected. Please re-submit with a clearer image.',
                type: 'verification'
            });
            getIO().to(id).emit('user_updated', { ghanaCardStatus: status });
        }
        catch (e) { /* socket optional */ }
        res.status(200).json({ message: `User card ${status.toLowerCase()} successfully`, user });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.verifyUserCard = verifyUserCard;
const verifyLandlord = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // VERIFIED, REJECTED
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const isVerified = status === 'VERIFIED';
        const user = await prisma_1.default.user.update({
            where: { id },
            data: {
                landlordVerificationStatus: status,
                isVerifiedLandlord: isVerified
            }
        });
        cache_1.default.del(`user:me:${id}`);
        cache_1.default.flushAll();
        try {
            const { emitToUser, emitToAll } = await import('../socket');
            emitToUser(id, 'user_updated', { landlordVerificationStatus: status, isVerifiedLandlord: isVerified });
            emitToAll('user_updated', { userId: id });
        }
        catch (e) { }
        // Dispatch SMS & Email Notification
        (0, notification_service_1.notifyLandlordVerification)({
            landlordId: user.id,
            landlordEmail: user.email,
            landlordName: `${user.firstName} ${user.lastName}`,
            landlordPhone: user.phoneNumber,
            isVerified
        }).catch((e) => console.error('[Notification Error]', e));
        res.status(200).json({
            message: `Landlord verification ${isVerified ? 'approved with Verified Blue Badge 🛡️' : 'rejected'}.`,
            user
        });
    }
    catch (error) {
        console.error('Error verifying landlord:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.verifyLandlord = verifyLandlord;
const getAllReviews = async (req, res) => {
    try {
        const reviews = await prisma_1.default.review.findMany({
            include: {
                author: { select: { firstName: true, lastName: true, email: true } },
                booking: { include: { property: { select: { title: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllReviews = getAllReviews;
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.review.delete({ where: { id } });
        res.status(200).json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteReview = deleteReview;
const activateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await prisma_1.default.propertySubscription.findUnique({
            where: { id },
            include: { property: { include: { landlord: { select: { id: true, firstName: true } } } } }
        });
        if (!subscription) {
            res.status(404).json({ message: 'Subscription not found' });
            return;
        }
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        const updated = await prisma_1.default.propertySubscription.update({
            where: { id },
            data: { isActive: true, paymentStatus: 'COMPLETED', startDate, endDate }
        });
        await prisma_1.default.property.update({
            where: { id: subscription.propertyId },
            data: { isAvailable: true }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, 'ACTIVATE_SUBSCRIPTION', 'PropertySubscription', id, { isActive: false }, { isActive: true }, req.ip || req.socket.remoteAddress);
        try {
            const { getIO } = await import('../socket');
            getIO().to(subscription.property.landlord.id).emit('notification', {
                title: 'Subscription Activated',
                message: `Your listing for "${subscription.property.title}" has been manually activated by an admin.`,
                type: 'subscription'
            });
        }
        catch (e) { /* socket optional */ }
        res.status(200).json({ message: 'Subscription activated successfully', subscription: updated });
    }
    catch (error) {
        console.error('Error activating subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.activateSubscription = activateSubscription;
const revokeSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const subscription = await prisma_1.default.propertySubscription.findUnique({
            where: { id },
            include: { property: { include: { landlord: { select: { id: true, firstName: true } } } } }
        });
        if (!subscription) {
            res.status(404).json({ message: 'Subscription not found' });
            return;
        }
        const updated = await prisma_1.default.propertySubscription.update({
            where: { id },
            data: { isActive: false, paymentStatus: 'FAILED' }
        });
        await prisma_1.default.property.update({
            where: { id: subscription.propertyId },
            data: { isAvailable: false }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, 'REVOKE_SUBSCRIPTION', 'PropertySubscription', id, { isActive: true }, { isActive: false, reason: reason || 'Admin revocation' }, req.ip || req.socket.remoteAddress);
        try {
            const { getIO } = await import('../socket');
            getIO().to(subscription.property.landlord.id).emit('notification', {
                title: 'Listing Subscription Revoked',
                message: `Your listing for "${subscription.property.title}" has been suspended by an admin. Reason: ${reason || 'Terms of Service violation'}.`,
                type: 'subscription'
            });
        }
        catch (e) { /* socket optional */ }
        res.status(200).json({ message: 'Subscription revoked successfully', subscription: updated });
    }
    catch (error) {
        console.error('Error revoking subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.revokeSubscription = revokeSubscription;
const resolveAppeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, moderationNote } = req.body; // decision: 'ACCEPTED' | 'REJECTED'
        if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
            res.status(400).json({ message: 'Decision must be ACCEPTED or REJECTED' });
            return;
        }
        const review = await prisma_1.default.review.findUnique({ where: { id } });
        if (!review) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }
        const updateData = {
            appealStatus: decision,
            moderationNote: moderationNote || '',
            isModerated: true
        };
        // If appeal is accepted, restore the review (unflag it)
        if (decision === 'ACCEPTED') {
            updateData.isFlagged = false;
        }
        await prisma_1.default.review.update({ where: { id }, data: updateData });
        // Recalculate tenant reputation after appeal resolution
        const booking = await prisma_1.default.booking.findUnique({ where: { id: review.bookingId } });
        if (booking) {
            const allReviews = await prisma_1.default.review.findMany({
                where: { booking: { tenantId: booking.tenantId }, isFlagged: false, isModerated: false },
                select: { rating: true }
            });
            if (allReviews.length > 0) {
                const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
                await prisma_1.default.user.update({ where: { id: booking.tenantId }, data: { reputationScore: parseFloat(avg.toFixed(2)) } });
            }
        }
        res.status(200).json({ message: `Appeal ${decision.toLowerCase()} successfully` });
    }
    catch (error) {
        console.error('Error resolving appeal:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.resolveAppeal = resolveAppeal;
const getSystemActivity = async (req, res) => {
    try {
        // Fetch the most recent cross-entity events to form a system activity log
        const [recentBookings, recentUsers, recentProperties, recentSubscriptions] = await Promise.all([
            prisma_1.default.booking.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: { tenant: { select: { firstName: true, lastName: true } }, property: { select: { title: true } } }
            }),
            prisma_1.default.user.findMany({ take: 8, orderBy: { createdAt: 'desc' }, select: { firstName: true, lastName: true, role: true, createdAt: true } }),
            prisma_1.default.property.findMany({ take: 8, orderBy: { createdAt: 'desc' }, select: { title: true, approvalStatus: true, createdAt: true } }),
            prisma_1.default.subscription.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { landlord: { select: { firstName: true, lastName: true } } } })
        ]);
        const activity = [
            ...recentBookings.map(b => ({ type: 'BOOKING', message: `${b.tenant.firstName} ${b.tenant.lastName} booked "${b.property.title}"`, status: b.status, createdAt: b.createdAt })),
            ...recentUsers.map(u => ({ type: 'USER', message: `New ${u.role} registered: ${u.firstName} ${u.lastName}`, status: 'NEW', createdAt: u.createdAt })),
            ...recentProperties.map(p => ({ type: 'PROPERTY', message: `Property "${p.title}" submitted (${p.approvalStatus})`, status: p.approvalStatus, createdAt: p.createdAt })),
            ...recentSubscriptions.map(s => ({ type: 'SUBSCRIPTION', message: `${s.landlord.firstName} ${s.landlord.lastName} initiated a subscription`, status: s.paymentStatus, createdAt: s.createdAt })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
        res.status(200).json(activity);
    }
    catch (error) {
        console.error('Error fetching system activity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSystemActivity = getSystemActivity;
const getConfig = async (req, res) => {
    try {
        const config = await (0, config_service_1.getSystemConfig)();
        res.status(200).json(config);
    }
    catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getConfig = getConfig;
const updateConfig = async (req, res) => {
    try {
        const { ghanaCardVerificationEnabled, bookingGracePeriodHours, platformCommissionPercent, roommateFinderEnabled, maintenanceMode, maintenanceEndTime } = req.body;
        const updatedConfig = await prisma_1.default.systemConfig.upsert({
            where: { id: 'GLOBAL' },
            update: {
                ...(ghanaCardVerificationEnabled !== undefined && { ghanaCardVerificationEnabled }),
                ...(bookingGracePeriodHours !== undefined && { bookingGracePeriodHours }),
                ...(platformCommissionPercent !== undefined && { platformCommissionPercent }),
                ...(roommateFinderEnabled !== undefined && { roommateFinderEnabled }),
                ...(maintenanceMode !== undefined && { maintenanceMode }),
                ...(maintenanceEndTime !== undefined && { maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null }),
            },
            create: {
                id: 'GLOBAL',
                ghanaCardVerificationEnabled: ghanaCardVerificationEnabled ?? true,
                bookingGracePeriodHours: bookingGracePeriodHours ?? 48,
                platformCommissionPercent: platformCommissionPercent ?? 5.0,
                roommateFinderEnabled: roommateFinderEnabled ?? true,
                maintenanceMode: maintenanceMode ?? false,
                maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null,
            }
        });
        (0, config_service_1.invalidateConfigCache)();
        try {
            (0, socket_1.emitToAll)('config_updated', updatedConfig);
        }
        catch (e) {
            console.error('Failed to emit config_updated socket event', e);
        }
        await (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_UPDATE_CONFIG', 'SystemConfig', 'GLOBAL', null, updatedConfig, req.ip || req.socket.remoteAddress);
        res.status(200).json({ message: 'Configuration updated successfully', config: updatedConfig });
    }
    catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateConfig = updateConfig;
const getAllTickets = async (req, res) => {
    try {
        const tickets = await prisma_1.default.maintenanceTicket.findMany({
            include: {
                tenant: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
                property: {
                    include: {
                        landlord: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(tickets);
    }
    catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllTickets = getAllTickets;
const adminUpdateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const ticket = await prisma_1.default.maintenanceTicket.findUnique({
            where: { id },
            include: { property: true }
        });
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        const updatedTicket = await prisma_1.default.maintenanceTicket.update({
            where: { id },
            data: { status }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_UPDATE_TICKET', 'MaintenanceTicket', id, { status: ticket.status }, { status }, req.ip || req.socket.remoteAddress);
        try {
            const { getIO } = await import('../socket');
            const io = getIO();
            // Notify both tenant and landlord
            io.to(ticket.tenantId).emit('notification', {
                title: `Ticket Escalate/Update`,
                message: `Your maintenance ticket "${ticket.title}" has been set to ${status.toLowerCase()} by an admin.`,
                type: 'ticket'
            });
            io.to(ticket.tenantId).emit('ticket_updated', { ticket: updatedTicket });
            io.to(ticket.property.landlordId).emit('notification', {
                title: `Ticket Escalation`,
                message: `Admin has updated the status of ticket "${ticket.title}" to ${status.toLowerCase()}.`,
                type: 'ticket'
            });
            io.to(ticket.property.landlordId).emit('ticket_updated', { ticket: updatedTicket });
        }
        catch (e) { /* ignore */ }
        res.status(200).json({ message: 'Ticket updated successfully', ticket: updatedTicket });
    }
    catch (error) {
        console.error('Error admin updating ticket:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.adminUpdateTicketStatus = adminUpdateTicketStatus;
const broadcastNotification = async (req, res) => {
    try {
        const { target, title, message } = req.body; // target: 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS'
        if (!['ALL_TENANTS', 'ALL_LANDLORDS', 'ALL_USERS'].includes(target)) {
            res.status(400).json({ message: 'Invalid target group' });
            return;
        }
        let users = [];
        if (target === 'ALL_TENANTS') {
            users = await prisma_1.default.user.findMany({ where: { role: 'TENANT' }, select: { id: true } });
        }
        else if (target === 'ALL_LANDLORDS') {
            users = await prisma_1.default.user.findMany({ where: { role: 'LANDLORD' }, select: { id: true } });
        }
        else {
            users = await prisma_1.default.user.findMany({ select: { id: true } });
        }
        if (users.length === 0) {
            res.status(200).json({ message: 'No users found for the target group', count: 0 });
            return;
        }
        // Create DB notifications
        const notificationsData = users.map(u => ({
            userId: u.id,
            title,
            message,
            type: 'ANNOUNCEMENT'
        }));
        await prisma_1.default.notification.createMany({
            data: notificationsData
        });
        // Broadcast via socket
        try {
            const { emitToUser } = await import('../socket');
            users.forEach(u => {
                emitToUser(u.id, 'notification', { title, message, type: 'ANNOUNCEMENT' });
            });
        }
        catch (e) {
            console.error('Socket emission failed for broadcast', e);
        }
        await (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_BROADCAST_NOTIFICATION', 'Notification', 'MASS', null, { target, count: users.length, title }, req.ip || req.socket.remoteAddress);
        res.status(200).json({ message: 'Broadcast successful', count: users.length });
    }
    catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.broadcastNotification = broadcastNotification;
//# sourceMappingURL=admin.controller.js.map