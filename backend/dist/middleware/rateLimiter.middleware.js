"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.speedLimiter = exports.apiRateLimiter = exports.uploadRateLimiter = exports.adminRateLimiter = exports.passwordResetRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
// ─── Auth routes: brute-force guard (login, register, refresh) ────────────────
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// ─── Password reset: protect email-flooding & token brute-force ───────────────
exports.passwordResetRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many password reset requests. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// ─── Admin-only routes: tighter ceiling ───────────────────────────────────────
exports.adminRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 60,
    message: { message: 'Admin request rate limit exceeded. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// ─── Upload routes: prevent bandwidth abuse ───────────────────────────────────
exports.uploadRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20,
    message: { message: 'Too many upload requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// ─── General API limiter: all other routes ────────────────────────────────────
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { message: 'Too many requests from this IP. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/api/health'), // Skip health checks
});
// ─── Speed limiter: slow repeated requests before hard-blocking ───────────────
exports.speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000,
    delayAfter: 50, // Begin slowing down after 50 requests
    delayMs: (hits) => hits * 100, // Add 100ms per excess request
});
//# sourceMappingURL=rateLimiter.middleware.js.map