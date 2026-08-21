import { Router } from 'express';
import { register, login, logout, refresh, verifyEmail, getMe, submitGhanaCard, updateProfile, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { getSessions, revokeSession } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { validate, registerValidation, loginValidation } from '../middleware/validation.middleware';

const router = Router();

router.post('/register', authRateLimiter, validate(registerValidation), register);
router.post('/login', authRateLimiter, validate(loginValidation), login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/verify-email', verifyEmail);
router.post('/ghana-card', authenticate, submitGhanaCard);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

// Session routes
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:id', authenticate, revokeSession);

export default router;
