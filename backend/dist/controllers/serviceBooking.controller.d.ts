import { Request, Response } from 'express';
/**
 * Request an on-demand home service
 */
export declare const createServiceBooking: (req: Request, res: Response) => Promise<void>;
/**
 * Get service bookings for a property or portfolio (Landlord / Staff / Admin)
 */
export declare const getPropertyServiceBookings: (req: Request, res: Response) => Promise<void>;
/**
 * Update service booking status (Landlord / Admin / Staff / Tenant)
 */
export declare const updateServiceBookingStatus: (req: Request, res: Response) => Promise<void>;
/**
 * Get tenant's service bookings
 */
export declare const getTenantServiceBookings: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel a service booking
 */
export declare const cancelServiceBooking: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=serviceBooking.controller.d.ts.map