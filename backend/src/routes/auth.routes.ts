import { Router } from 'express';
import { register, login, logout, refresh, verifyEmail, getMe, submitGhanaCard, updateProfile, requestProfileUnlock, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { getSessions, revokeSession, revokeAllOtherSessions } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter, loginRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.middleware';
import { validate, registerValidation, loginValidation } from '../middleware/validation.middleware';

const router = Router();

router.post('/register', authRateLimiter, validate(registerValidation), register);
router.post('/login', loginRateLimiter, validate(loginValidation), login);
router.post('/logout', logout);
router.post('/refresh', authRateLimiter, refresh);
router.post('/verify-email', verifyEmail);
router.post('/ghana-card', authenticate, submitGhanaCard);
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/request-unlock', authenticate, requestProfileUnlock);

// Session routes
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/others', authenticate, revokeAllOtherSessions);
router.delete('/sessions/:id', authenticate, revokeSession);

export default router;
