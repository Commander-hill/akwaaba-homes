import { Request, Response } from 'express';
/**
 * Submit a lease renewal request
 */
export declare const requestLeaseRenewal: (req: Request, res: Response) => Promise<void>;
/**
 * Get tenant's renewal requests
 */
export declare const getTenantRenewals: (req: Request, res: Response) => Promise<void>;
/**
 * Get landlord's incoming lease renewal requests
 */
export declare const getLandlordRenewals: (req: Request, res: Response) => Promise<void>;
/**
 * Respond to a lease renewal request (Landlord: ACCEPTED, DECLINED, NEGOTIATING)
 */
export declare const respondLeaseRenewal: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=leaseRenewal.controller.d.ts.map