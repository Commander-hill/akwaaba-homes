"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authenticate = void 0;
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
        // Verify token version to revoke stale sessions upon password reset or logout from all devices
        if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
            res.status(401).json({ message: 'Session has expired or was revoked. Please log in again.' });
            return;
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error during authentication.' });
    }
};
exports.authenticate = authenticate;
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: 'You do not have permission to perform this action.' });
            return;
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
//# sourceMappingURL=auth.middleware.js.map