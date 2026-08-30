"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompoundNotice = exports.getLandlordNotices = exports.getPropertyNotices = exports.createCompoundNotice = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
/**
 * Post a new Compound Broadcast Notice to Residents
 */
const createCompoundNotice = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId, title, message, category, priority, expiresAt } = req.body;
        if (!propertyId || !title || !message) {
            res.status(400).json({ message: 'Property ID, title, and message are required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId },
            include: {
                bookings: {
                    where: { status: { in: ['APPROVED', 'COMPLETED', 'CONFIRMED'] } },
                    select: { tenantId: true }
                }
            }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const notice = await prisma_1.default.compoundNotice.create({
            data: {
                propertyId,
                landlordId,
                title,
                message,
                category: category || 'GENERAL',
                priority: priority || 'NORMAL',
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive: true
            }
        });
        // Broadcast in-app & socket alerts to all active tenants in this property
        const tenantIds = Array.from(new Set(property.bookings.map((b) => b.tenantId)));
        try {
            const io = (0, socket_1.getIO)();
            for (const tId of tenantIds) {
                await prisma_1.default.notification.create({
                    data: {
                        userId: tId,
                        type: 'ANNOUNCEMENT',
                        title: `📢 Compound Notice: ${title}`,
                        message: `${property.title}: ${message.substring(0, 100)}...`,
                        link: '/dashboard/tenant'
                    }
                }).catch(() => null);
                io.to(tId).emit('notification', {
                    title: `📢 Notice for ${property.title}`,
                    message: title,
                    type: 'announcement'
                });
            }
            io.emit('notice_created', { notice, propertyId, propertyTitle: property.title });
        }
        catch (e) {
            console.warn('Socket broadcast warning:', e);
        }
        res.status(201).json({
            message: 'Notice broadcasted successfully',
            notice,
            audienceCount: tenantIds.length
        });
    }
    catch (error) {
        console.error('Error creating compound notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createCompoundNotice = createCompoundNotice;
/**
 * Get active notices for a property (viewable by landlord and residents)
 */
const getPropertyNotices = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const notices = await prisma_1.default.compoundNotice.findMany({
            where: {
                propertyId,
                isActive: true
            },
            include: {
                property: {
                    select: { id: true, title: true, location: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ notices });
    }
    catch (error) {
        console.error('Error fetching property notices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyNotices = getPropertyNotices;
/**
 * Get all notices published by the current landlord
 */
const getLandlordNotices = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const notices = await prisma_1.default.compoundNotice.findMany({
            where: { landlordId },
            include: {
                property: {
                    select: { id: true, title: true, location: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ notices });
    }
    catch (error) {
        console.error('Error fetching landlord notices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordNotices = getLandlordNotices;
/**
 * Delete / Archive a notice
 */
const deleteCompoundNotice = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { id } = req.params;
        const notice = await prisma_1.default.compoundNotice.findUnique({
            where: { id }
        });
        if (!notice) {
            res.status(404).json({ message: 'Notice not found' });
            return;
        }
        if (notice.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        await prisma_1.default.compoundNotice.delete({
            where: { id }
        });
        try {
            (0, socket_1.getIO)().emit('notice_updated', { noticeId: id, propertyId: notice.propertyId });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({ message: 'Notice removed successfully' });
    }
    catch (error) {
        console.error('Error deleting notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteCompoundNotice = deleteCompoundNotice;
//# sourceMappingURL=compoundNotice.controller.js.map