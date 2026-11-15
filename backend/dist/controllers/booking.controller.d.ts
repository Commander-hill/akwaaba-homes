import { Request, Response } from 'express';
export declare const downloadAgreementPDF: (req: Request, res: Response) => Promise<void>;
export declare const createBooking: (req: Request, res: Response) => Promise<void>;
export declare const getTenantBookings: (req: Request, res: Response) => Promise<void>;
export declare const getBookingById: (req: Request, res: Response) => Promise<void>;
export declare const getLandlordBookings: (req: Request, res: Response) => Promise<void>;
export declare const updateBookingStatus: (req: Request, res: Response) => Promise<void>;
export declare const payBooking: (req: Request, res: Response) => Promise<void>;
export declare const verifyPayment: (req: Request, res: Response) => Promise<void>;
export declare const getMyActiveBooking: (req: Request, res: Response) => Promise<void>;
export declare const cancelPendingBooking: (req: Request, res: Response) => Promise<void>;
export declare const deleteBooking: (req: Request, res: Response) => Promise<void>;
/**
 * Checks active/paid bookings whose nextRentDueDate is within 7 days or overdue,
 * and dispatches deduplicated in-app + socket reminders to tenants and landlords.
 */
export declare const processRentDueReminders: () => Promise<{
    checked: number;
    reminded: number;
}>;
export declare const checkRentDueReminders: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=booking.controller.d.ts.map