"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderNotices = exports.deleteNotice = exports.updateNotice = exports.createNotice = exports.getAllNotices = exports.recordNoticeView = exports.getActiveNotices = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("../utils/cache"));
const getActiveNotices = async (req, res) => {
    try {
        const notices = await prisma_1.default.notice.findMany({
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' }
        });
        res.status(200).json(notices);
    }
    catch (error) {
        console.error('Error fetching notices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getActiveNotices = getActiveNotices;
const recordNoticeView = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma_1.default.notice.update({
            where: { id },
            data: { views: { increment: 1 } },
            select: { id: true, views: true }
        });
        res.status(200).json(updated);
    }
    catch (error) {
        res.status(404).json({ message: 'Notice not found' });
    }
};
exports.recordNoticeView = recordNoticeView;
const getAllNotices = async (req, res) => {
    try {
        const notices = await prisma_1.default.notice.findMany({
            orderBy: { orderIndex: 'asc' }
        });
        res.status(200).json(notices);
    }
    catch (error) {
        console.error('Error fetching all notices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllNotices = getAllNotices;
const createNotice = async (req, res) => {
    try {
        const { orderIndex, topLabel, title, description, buttonText, buttonLink, iconType, isActive } = req.body;
        const notice = await prisma_1.default.notice.create({
            data: {
                orderIndex: orderIndex || 0,
                topLabel,
                title,
                description,
                buttonText,
                buttonLink,
                iconType,
                isActive: isActive !== undefined ? isActive : true
            }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, 'CREATE_NOTICE', 'Notice', notice.id, null, notice, req.ip || req.socket.remoteAddress);
        try {
            (0, socket_1.getIO)().emit('notice_updated', notice);
            cache_1.default.flushAll();
        }
        catch (e) { }
        res.status(201).json({ message: 'Notice created successfully', notice });
    }
    catch (error) {
        console.error('Error creating notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createNotice = createNotice;
const updateNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderIndex, topLabel, title, description, buttonText, buttonLink, iconType, isActive } = req.body;
        const oldNotice = await prisma_1.default.notice.findUnique({ where: { id } });
        if (!oldNotice) {
            res.status(404).json({ message: 'Notice not found' });
            return;
        }
        const notice = await prisma_1.default.notice.update({
            where: { id },
            data: {
                orderIndex: orderIndex !== undefined ? orderIndex : oldNotice.orderIndex,
                topLabel: topLabel !== undefined ? topLabel : oldNotice.topLabel,
                title: title || oldNotice.title,
                description: description || oldNotice.description,
                buttonText: buttonText !== undefined ? buttonText : oldNotice.buttonText,
                buttonLink: buttonLink !== undefined ? buttonLink : oldNotice.buttonLink,
                iconType: iconType !== undefined ? iconType : oldNotice.iconType,
                isActive: isActive !== undefined ? isActive : oldNotice.isActive
            }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, 'UPDATE_NOTICE', 'Notice', id, oldNotice, notice, req.ip || req.socket.remoteAddress);
        try {
            (0, socket_1.getIO)().emit('notice_updated', notice);
            cache_1.default.flushAll();
        }
        catch (e) { }
        res.status(200).json({ message: 'Notice updated successfully', notice });
    }
    catch (error) {
        console.error('Error updating notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateNotice = updateNotice;
const deleteNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const notice = await prisma_1.default.notice.findUnique({ where: { id } });
        if (!notice) {
            res.status(404).json({ message: 'Notice not found' });
            return;
        }
        await prisma_1.default.notice.delete({ where: { id } });
        await (0, auditLogger_1.logAudit)(req.user.id, 'DELETE_NOTICE', 'Notice', id, notice, null, req.ip || req.socket.remoteAddress);
        try {
            (0, socket_1.getIO)().emit('notice_updated', { id });
            cache_1.default.flushAll();
        }
        catch (e) { }
        res.status(200).json({ message: 'Notice deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteNotice = deleteNotice;
const reorderNotices = async (req, res) => {
    try {
        const { items } = req.body; // Array<{ id: string; orderIndex: number }>
        if (!Array.isArray(items)) {
            res.status(400).json({ message: 'Invalid items array' });
            return;
        }
        await prisma_1.default.$transaction(items.map((item) => prisma_1.default.notice.update({
            where: { id: item.id },
            data: { orderIndex: item.orderIndex }
        })));
        try {
            (0, socket_1.getIO)().emit('notice_updated', { reordered: true });
            cache_1.default.flushAll();
        }
        catch (e) { }
        res.status(200).json({ message: 'Notices reordered successfully' });
    }
    catch (error) {
        console.error('Error reordering notices:', error);
        res.status(500).json({ message: 'Failed to reorder notices' });
    }
};
exports.reorderNotices = reorderNotices;
//# sourceMappingURL=notice.controller.js.map