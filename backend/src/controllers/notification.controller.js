"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastAnnouncement = exports.markAllAsRead = exports.markAsRead = exports.getMyNotifications = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const notification_service_1 = require("../utils/notification.service");
// Get current user's notifications (newest first)
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        const unreadCount = await prisma_1.default.notification.count({ where: { userId, isRead: false } });
        res.status(200).json({ notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMyNotifications = getMyNotifications;
// Mark a single notification as read
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await prisma_1.default.notification.updateMany({
            where: { id, userId },
            data: { isRead: true }
        });
        res.status(200).json({ message: 'Marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.markAsRead = markAsRead;
// Mark all as read
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await prisma_1.default.notification.updateMany({ where: { userId }, data: { isRead: true } });
        res.status(200).json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.markAllAsRead = markAllAsRead;
// Admin: Broadcast announcement to all users (or by role)
const broadcastAnnouncement = async (req, res) => {
    try {
        const { subject, message, targetRole } = req.body;
        if (!subject || !message) {
            res.status(400).json({ message: 'Subject and message are required' });
            return;
        }
        const whereClause = targetRole && targetRole !== 'ALL' ? { role: targetRole } : {};
        const users = await prisma_1.default.user.findMany({
            where: { ...whereClause, isSuspended: false },
            select: { id: true, email: true, firstName: true, lastName: true }
        });
        await (0, notification_service_1.notifyAdminAnnouncement)({
            userIds: users.map(u => u.id),
            emailList: users.map(u => ({ email: u.email, name: `${u.firstName} ${u.lastName}` })),
            subject,
            message
        });
        res.status(200).json({ message: `Announcement sent to ${users.length} user(s)` });
    }
    catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.broadcastAnnouncement = broadcastAnnouncement;
//# sourceMappingURL=notification.controller.js.map