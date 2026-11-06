"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdmin = exports.authorizeRole = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = __importDefault(require("../utils/prisma"));
const authenticate = async (req, res, next) => {
    // Check Authorization header or cookies
    let token = req.cookies.accessToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        res.status(401).json({ message: 'Authentication required. No token provided.' });
        return;
    }
    const decoded = (0, jwt_1.verifyAccessToken)(token);
    if (!decoded) {
        res.status(401).json({ message: 'Invalid or expired token.' });
        return;
    }
    // Check if user is suspended
    try {
        const user = await prisma_1.default.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            res.status(401).json({ message: 'User not found.' });
            return;
        }
        if (user.isSuspended) {
            res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
            return;
        }
        // Verify token version to immediately invalidate stale sessions upon password reset or administrative revocation
        if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
            res.status(401).json({ message: 'Session has expired or was revoked. Please log in again.' });
            return;
        }
        // Hydrate req.user from the fresh, trusted database state rather than stale token claims
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            isSuspended: user.isSuspended,
            isEmailVerified: user.isEmailVerified,
            twoFactorEnabled: user.twoFactorEnabled,
            tokenVersion: user.tokenVersion,
        };
        next();
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error during authentication.' });
    }
};
exports.authenticate = authenticate;
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || (!roles.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN')) {
            res.status(403).json({ message: 'You do not have permission to perform this action.' });
            return;
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
const requireAdmin = (req, res, next) => {
    if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        res.status(403).json({ message: 'Access denied: Administrator clearance required.' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ message: 'Elevated authorization required: Super Administrator clearance is required for this action.' });
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=auth.middleware.js.map