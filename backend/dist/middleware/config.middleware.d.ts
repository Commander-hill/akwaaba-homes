import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to enforce global maintenance mode.
 * Blocks all requests for non-admin users if maintenanceMode is enabled.
 */
export declare const checkMaintenanceMode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to enforce Roommate Finder feature flag.
 */
export declare const checkRoommateFeatureEnabled: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=config.middleware.d.ts.map