import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
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
    // Verify token version to revoke stale sessions upon password reset or logout from all devices
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({ message: 'Session has expired or was revoked. Please log in again.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error during authentication.' });
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
};
