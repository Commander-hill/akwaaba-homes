"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const session_controller_1 = require("../controllers/session.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_middleware_1.authRateLimiter, (0, validation_middleware_1.validate)(validation_middleware_1.registerValidation), auth_controller_1.register);
router.post('/login', rateLimiter_middleware_1.authRateLimiter, (0, validation_middleware_1.validate)(validation_middleware_1.loginValidation), auth_controller_1.login);
router.post('/logout', auth_controller_1.logout);
router.post('/refresh', auth_controller_1.refresh);
router.post('/verify-email', auth_controller_1.verifyEmail);
router.post('/ghana-card', auth_middleware_1.authenticate, auth_controller_1.submitGhanaCard);
router.post('/forgot-password', rateLimiter_middleware_1.authRateLimiter, auth_controller_1.forgotPassword);
router.post('/reset-password', rateLimiter_middleware_1.authRateLimiter, auth_controller_1.resetPassword);
// Protected routes
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getMe);
router.put('/profile', auth_middleware_1.authenticate, auth_controller_1.updateProfile);
// Session routes
router.get('/sessions', auth_middleware_1.authenticate, session_controller_1.getSessions);
router.delete('/sessions/:id', auth_middleware_1.authenticate, session_controller_1.revokeSession);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map