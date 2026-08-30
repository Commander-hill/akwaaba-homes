import { Request, Response } from 'express';
/**
 * Log an incoming package delivery (Porter / Security / Tenant)
 */
export declare const logPackageDelivery: (req: Request, res: Response) => Promise<void>;
/**
 * Get tenant's package deliveries
 */
export declare const getTenantDeliveries: (req: Request, res: Response) => Promise<void>;
/**
 * Confirm parcel pickup (Porter or Tenant verifies OTP)
 */
export declare const confirmParcelPickup: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=delivery.controller.d.ts.map