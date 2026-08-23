import { Request, Response, NextFunction } from 'express';
import { getSystemConfig } from '../utils/config.service';

/**
 * Middleware to enforce global maintenance mode.
 * Blocks all requests for non-admin users if maintenanceMode is enabled.
 */
export const checkMaintenanceMode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Exempt health check, admin endpoints, login, getMe, and public config from maintenance mode
    const path = req.path;
    const isExempt = 
      path.startsWith('/health') || 
      path.startsWith('/v1/admin') || 
      path.startsWith('/v1/config') || 
      path.startsWith('/v1/auth/login') ||
      path.startsWith('/v1/auth/me');

    if (isExempt) {
      return next();
    }

    const config = await getSystemConfig();
    if (config.maintenanceMode) {
      // Allow authenticated ADMIN users to bypass maintenance mode
      const user = (req as any).user;
      if (user && user.role === 'ADMIN') {
        return next();
      }

      res.status(503).json({
        message: 'Platform is currently undergoing scheduled maintenance. Please try again shortly.',
        maintenanceMode: true
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking maintenance mode middleware:', error);
    next();
  }
};

/**
 * Middleware to enforce Roommate Finder feature flag.
 */
export const checkRoommateFeatureEnabled = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await getSystemConfig();
    if (!config.roommateFinderEnabled) {
      res.status(403).json({
        message: 'The Roommate Finder feature is currently disabled by platform administration.'
      });
      return;
    }
    next();
  } catch (error) {
    console.error('Error checking roommate feature flag:', error);
    next();
  }
};
