import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyStepUpToken } from '../utils/jwt';
import prisma from '../utils/prisma';

// Extend the Express Request interface to include the user & rawBody
declare global {
  namespace Express {
    interface Request {
      user?: any;
      rawBody?: Buffer;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check Authorization header or cookies
  let token = req.cookies.accessToken;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Authentication required. No token provided.' });
    return;
  }

  const decoded = verifyAccessToken(token) as any;

  if (!decoded) {
    res.status(401).json({ message: 'Invalid or expired token.' });
    return;
  }

  // Check if user is suspended
  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ message: 'User not found.' });
      return;
    }
    if (user.isSuspended) {
      res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
      return;
    }
    // Verify token version to immediately invalidate stale sessions upon password reset or administrative revocation
    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      res.status(401).json({ message: 'Session has expired or was revoked. Please log in again.' });
      return;
    }

    // Hydrate req.user from the fresh, trusted database state rather than stale token claims
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuspended: user.isSuspended,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      tokenVersion: user.tokenVersion,
    };
    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error during authentication.' });
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || (!roles.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN')) {
      res.status(403).json({ message: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    res.status(403).json({ message: 'Access denied: Administrator clearance required.' });
    return;
  }
  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Elevated authorization required: Super Administrator clearance is required for this action.' });
    return;
  }
  next();
};


/**
 * ── STEP-UP AUTHENTICATION (ACT 843 §20 & CYBER SECURITY ACT 1038) ──
 * Enforces cryptographic step-up re-authentication token for critical financial
 * and statutory deed governance operations.
 */
export const requireStepUpAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    res.status(403).json({ message: 'Access denied: Administrator clearance required.' });
    return;
  }

  const stepUpToken = (req.headers['x-step-up-token'] as string) || req.body?.stepUpToken;

  if (!stepUpToken) {
    res.status(403).json({
      requireStepUp: true,
      message: 'Step-up authentication required under Act 843 and Ghana Cyber Security Act governance. Please confirm your administrator credentials to proceed with this critical action.'
    });
    return;
  }

  const decoded = verifyStepUpToken(stepUpToken) as any;
  if (!decoded || decoded.purpose !== 'STEP_UP_AUTHENTICATION' || decoded.adminId !== req.user.id) {
    res.status(403).json({
      requireStepUp: true,
      message: 'Step-up authentication token has expired or is invalid. Please re-authenticate.'
    });
    return;
  }

  next();
};
