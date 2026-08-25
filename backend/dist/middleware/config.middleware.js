"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoommateFeatureEnabled = exports.checkMaintenanceMode = void 0;
const config_service_1 = require("../utils/config.service");
const jwt_1 = require("../utils/jwt");
/**
 * Middleware to enforce global maintenance mode.
 * Blocks all requests for non-admin users if maintenanceMode is enabled.
 */
const checkMaintenanceMode = async (req, res, next) => {
    try {
        // Exempt health check, admin endpoints, login, getMe, and public config from maintenance mode
        const path = req.path;
        const isExempt = path.startsWith('/health') ||
            path.startsWith('/v1/admin') ||
            path.startsWith('/v1/config') ||
            path.startsWith('/v1/auth/login') ||
            path.startsWith('/v1/auth/me');
        if (isExempt) {
            return next();
        }
        const config = await (0, config_service_1.getSystemConfig)();
        if (config.maintenanceMode) {
            // Auto-expire maintenance mode if current time has surpassed maintenanceEndTime
            if (config.maintenanceEndTime && new Date() >= new Date(config.maintenanceEndTime)) {
                return next();
            }
            // Allow authenticated ADMIN users to bypass maintenance mode
            let user = req.user;
            if (!user) {
                let token = req.cookies?.accessToken;
                if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                    token = req.headers.authorization.split(' ')[1];
                }
                if (token) {
                    const decoded = (0, jwt_1.verifyAccessToken)(token);
                    if (decoded) {
                        user = decoded;
                        req.user = decoded;
                    }
                }
            }
            if (user && user.role === 'ADMIN') {
                return next();
            }
            res.status(503).json({
                message: 'Platform is currently undergoing scheduled maintenance. Please try again shortly.',
                maintenanceMode: true,
                maintenanceEndTime: config.maintenanceEndTime
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Error checking maintenance mode middleware:', error);
        next();
    }
};
exports.checkMaintenanceMode = checkMaintenanceMode;
/**
 * Middleware to enforce Roommate Finder feature flag.
 */
const checkRoommateFeatureEnabled = async (req, res, next) => {
    try {
        const config = await (0, config_service_1.getSystemConfig)();
        if (!config.roommateFinderEnabled) {
            res.status(403).json({
                message: 'The Roommate Finder feature is currently disabled by platform administration.'
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Error checking roommate feature flag:', error);
        next();
    }
};
exports.checkRoommateFeatureEnabled = checkRoommateFeatureEnabled;
//# sourceMappingURL=config.middleware.js.map