import { Request, Response, NextFunction } from 'express';
import { getSystemConfig } from '../utils/config.service';
import { verifyAccessToken } from '../utils/jwt';

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
      // Auto-expire maintenance mode if current time has surpassed maintenanceEndTime
      if (config.maintenanceEndTime && new Date() >= new Date(config.maintenanceEndTime)) {
        return next();
      }

      // Allow authenticated ADMIN and SUPER_ADMIN users to bypass maintenance mode
      let user = (req as any).user;
      if (!user) {
        let token = req.cookies?.accessToken;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
          token = req.headers.authorization.split(' ')[1];
        }
        if (token) {
          try {
            const decoded = verifyAccessToken(token) as any;
            if (decoded) {
              user = decoded;
              (req as any).user = decoded;
            }
          } catch {
            // Invalid token, proceed as unauthenticated
          }
        }
      }

      if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
        return next();
      }

      const scope = config.maintenanceScope || 'GLOBAL';

      // Selective Scope Enforcement:
      // If maintenance is scoped to TENANTS_ONLY, permit Landlord and Caretaker traffic
      if (scope === 'TENANTS_ONLY') {
        if (user && (user.role === 'LANDLORD' || user.role === 'CARETAKER')) {
          return next();
        }
        const isLandlordOnlyRoute = 
          path.startsWith('/v1/payouts') || 
          path.startsWith('/v1/expenses') || 
          path.startsWith('/v1/occupancy') || 
          path.startsWith('/v1/staff');
        if (isLandlordOnlyRoute) {
          return next();
        }
      }

      // If maintenance is scoped to LANDLORDS_ONLY, permit Tenant traffic
      if (scope === 'LANDLORDS_ONLY') {
        if (user && user.role === 'TENANT') {
          return next();
        }
        const isPublicTenantRoute = 
          path.startsWith('/v1/properties') || 
          path.startsWith('/v1/rooms') || 
          path.startsWith('/v1/reviews') || 
          path.startsWith('/v1/wishlist') || 
          path.startsWith('/v1/roommates');
        if (isPublicTenantRoute) {
          return next();
        }
      }

      // Compute truthful Retry-After header in seconds
      if (config.maintenanceEndTime) {
        const secondsLeft = Math.max(1, Math.ceil((new Date(config.maintenanceEndTime).getTime() - Date.now()) / 1000));
        res.setHeader('Retry-After', String(secondsLeft));
      }

      res.status(503).json({
        code: 'MAINTENANCE_MODE',
        message: config.maintenanceMessage || 'Platform is currently undergoing scheduled maintenance. Please try again shortly.',
        title: config.maintenanceTitle || 'Scheduled Platform Maintenance',
        maintenanceMode: true,
        maintenanceScope: scope,
        maintenanceEndTime: config.maintenanceEndTime,
        supportEmail: config.maintenanceContactEmail || 'support@akwaabahomes.com',
        supportPhone: config.maintenanceContactPhone || '+233 24 000 0000',
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
