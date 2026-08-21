"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSession = exports.getSessions = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { refreshToken: currentRefreshToken } = req.cookies;
        const sessions = await prisma_1.default.session.findMany({
            where: {
                userId,
                isValid: true,
                expiresAt: { gt: new Date() }
            },
            orderBy: { lastActive: 'desc' },
            select: {
                id: true,
                ipAddress: true,
                userAgent: true,
                deviceFamily: true,
                osFamily: true,
                lastActive: true,
                createdAt: true,
                refreshToken: true // Need this internally to determine which is "current"
            }
        });
        // Map to mark which one is the current session
        const formattedSessions = sessions.map(s => ({
            id: s.id,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            deviceFamily: s.deviceFamily,
            osFamily: s.osFamily,
            lastActive: s.lastActive,
            createdAt: s.createdAt,
            isCurrentSession: s.refreshToken === currentRefreshToken
        }));
        res.status(200).json({ sessions: formattedSessions });
    }
    catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSessions = getSessions;
const revokeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const session = await prisma_1.default.session.findUnique({ where: { id } });
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.userId !== userId) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        await prisma_1.default.session.update({
            where: { id },
            data: { isValid: false }
        });
        res.status(200).json({ message: 'Session revoked successfully' });
    }
    catch (error) {
        console.error('Revoke session error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.revokeSession = revokeSession;
//# sourceMappingURL=session.controller.js.map