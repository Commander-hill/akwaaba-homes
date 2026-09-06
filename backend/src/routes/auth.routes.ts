import { Router } from 'express';
import {
  register,
  login,
  login2FA,
  get2FAStatus,
  setup2FA,
  enable2FA,
  disable2FA,
  logout,
  refresh,
  verifyEmail,
  getMe,
  submitGhanaCard,
  submitLandlordVerification,
  submitStudentVerification,
  updateProfile,
  requestProfileUnlock,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller';
import { getSessions, revokeSession, revokeAllOtherSessions } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter, loginRateLimiter, passwordResetRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.middleware';
import { validate, registerValidation, loginValidation } from '../middleware/validation.middleware';

const router = Router();

router.post('/register', authRateLimiter, validate(registerValidation), register);
router.post('/login', loginRateLimiter, validate(loginValidation), login);
router.post('/login/2fa', loginRateLimiter, login2FA);
router.post('/logout', logout);
router.post('/refresh', authRateLimiter, refresh);
router.post('/verify-email', otpRateLimiter, verifyEmail);
router.post('/ghana-card', authenticate, submitGhanaCard);
router.post('/landlord-verification', authenticate, submitLandlordVerification);
router.post('/student-verification', authenticate, submitStudentVerification);
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);

// Two-Factor Authentication Management (Authenticated)
router.get('/2fa/status', authenticate, get2FAStatus);
router.post('/2fa/setup', authenticate, setup2FA);
router.post('/2fa/enable', authenticate, enable2FA);
router.post('/2fa/disable', authenticate, disable2FA);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/request-unlock', authenticate, requestProfileUnlock);

// Session routes
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/others', authenticate, revokeAllOtherSessions);
router.delete('/sessions/:id', authenticate, revokeSession);

export default router;
