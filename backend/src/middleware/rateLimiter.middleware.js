"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Strict rate limit for authentication endpoints to prevent brute-force attacks
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window (5 was too strict for dev; tighten in production)
    message: {
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// General API rate limit for all other routes
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `windowMs`
    message: {
        message: 'Too many requests from this IP, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimiter.middleware.js.map