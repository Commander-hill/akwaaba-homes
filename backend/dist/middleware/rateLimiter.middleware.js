"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.speedLimiter = exports.apiRateLimiter = exports.uploadRateLimiter = exports.adminRateLimiter = exports.otpRateLimiter = exports.passwordResetRateLimiter = exports.authRateLimiter = exports.loginRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
// ─── Login brute-force guard (5 attempts per 15 mins per IP) ─────────────────
exports.loginRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many login attempts. Your IP has been temporarily restricted for 15 minutes to prevent brute-force attacks.' },
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
});
// ─── General auth routes: registration & refresh guard ─────────────────────
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: { error: 'Too many authentication requests. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
});
// ─── Password reset: protect email-flooding & token brute-force ───────────────
exports.passwordResetRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many password reset requests. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
});
// ─── OTP & Email Verification Rate Limiter (5 attempts / 15 mins) ─────────────
exports.otpRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many verification code requests. Please wait 15 minutes before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
});
// ─── Admin-only routes: tighter ceiling ───────────────────────────────────────
exports.adminRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 60,
    message: { error: 'Admin request rate limit exceeded. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
});
// ─── Upload routes: prevent bandwidth abuse ───────────────────────────────────
exports.uploadRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20,
    message: { error: 'Too many upload requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
});
// ─── General API limiter: all other routes ────────────────────────────────────
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: 'Too many requests from this IP. Please slow down and try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    skip: (req) => req.path.startsWith('/api/health'), // Skip health checks
});
// ─── Speed limiter: slow repeated requests before hard-blocking ───────────────
exports.speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000,
    delayAfter: 60, // Begin slowing down after 60 requests
    delayMs: (hits) => hits * 100, // Add 100ms per excess request
});
//# sourceMappingURL=rateLimiter.middleware.js.map