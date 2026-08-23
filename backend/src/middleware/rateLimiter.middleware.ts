import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// ─── Auth routes: brute-force guard (login, register, refresh) ────────────────
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Password reset: protect email-flooding & token brute-force ───────────────
export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Admin-only routes: tighter ceiling ───────────────────────────────────────
export const adminRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,
  message: { message: 'Admin request rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Upload routes: prevent bandwidth abuse ───────────────────────────────────
export const uploadRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: { message: 'Too many upload requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── General API limiter: all other routes ────────────────────────────────────
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/health'), // Skip health checks
});

// ─── Speed limiter: slow repeated requests before hard-blocking ───────────────
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // Begin slowing down after 50 requests
  delayMs: (hits) => hits * 100, // Add 100ms per excess request
});
