import { Request, Response } from 'express';
export declare const createBooking: (req: Request, res: Response) => Promise<void>;
export declare const getTenantBookings: (req: Request, res: Response) => Promise<void>;
export declare const getLandlordBookings: (req: Request, res: Response) => Promise<void>;
export declare const updateBookingStatus: (req: Request, res: Response) => Promise<void>;
export declare const payBooking: (req: Request, res: Response) => Promise<void>;
export declare const verifyPayment: (req: Request, res: Response) => Promise<void>;
export declare const getMyActiveBooking: (req: Request, res: Response) => Promise<void>;
export declare const cancelPendingBooking: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=booking.controller.d.ts.map