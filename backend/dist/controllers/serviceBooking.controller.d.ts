import { Request, Response } from 'express';
/**
 * Request an on-demand home service
 */
export declare const createServiceBooking: (req: Request, res: Response) => Promise<void>;
/**
 * Get tenant's service bookings
 */
export declare const getTenantServiceBookings: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel a service booking
 */
export declare const cancelServiceBooking: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=serviceBooking.controller.d.ts.map