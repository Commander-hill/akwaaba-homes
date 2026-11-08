import { Request, Response } from 'express';
export declare const getAuditLogs: (req: Request, res: Response) => Promise<void>;
export declare const getSystemStats: (req: Request, res: Response) => Promise<void>;
export declare const getActionRequiredQueue: (req: Request, res: Response) => Promise<void>;
export declare const getPlatformAnalytics: (req: Request, res: Response) => Promise<void>;
export declare const getAllUsers: (req: Request, res: Response) => Promise<void>;
export declare const getUserById: (req: Request, res: Response) => Promise<void>;
export declare const getPropertyById: (req: Request, res: Response) => Promise<void>;
export declare const getBookingById: (req: Request, res: Response) => Promise<void>;
export declare const getSubscriptionById: (req: Request, res: Response) => Promise<void>;
export declare const getTransactionById: (req: Request, res: Response) => Promise<void>;
export declare const getDisputeById: (req: Request, res: Response) => Promise<void>;
export declare const getReviewById: (req: Request, res: Response) => Promise<void>;
export declare const searchEntities: (req: Request, res: Response) => Promise<void>;
export declare const getAdministrators: (req: Request, res: Response) => Promise<void>;
export declare const createAdministrator: (req: Request, res: Response) => Promise<void>;
export declare const toggleAdminStatus: (req: Request, res: Response) => Promise<void>;
export declare const toggleUserSuspension: (req: Request, res: Response) => Promise<void>;
export declare const toggleUserProfileLock: (req: Request, res: Response) => Promise<void>;
export declare const getAllProperties: (req: Request, res: Response) => Promise<void>;
export declare const updatePropertyApproval: (req: Request, res: Response) => Promise<void>;
export declare const getAllBookings: (req: Request, res: Response) => Promise<void>;
export declare const getAllSubscriptions: (req: Request, res: Response) => Promise<void>;
export declare const getAllTransactions: (req: Request, res: Response) => Promise<void>;
export declare const verifyUserCard: (req: Request, res: Response) => Promise<void>;
export declare const verifyLandlord: (req: Request, res: Response) => Promise<void>;
export declare const getAllReviews: (req: Request, res: Response) => Promise<void>;
export declare const deleteReview: (req: Request, res: Response) => Promise<void>;
export declare const activateSubscription: (req: Request, res: Response) => Promise<void>;
export declare const revokeSubscription: (req: Request, res: Response) => Promise<void>;
export declare const resolveAppeal: (req: Request, res: Response) => Promise<void>;
export declare const getSystemActivity: (req: Request, res: Response) => Promise<void>;
export declare const getConfig: (req: Request, res: Response) => Promise<void>;
export declare const updateConfig: (req: Request, res: Response) => Promise<void>;
export declare const getMaintenanceHistory: (req: Request, res: Response) => Promise<void>;
export declare const getAllTickets: (req: Request, res: Response) => Promise<void>;
export declare const getTicketById: (req: Request, res: Response) => Promise<void>;
export declare const adminUpdateTicketStatus: (req: Request, res: Response) => Promise<void>;
export declare const broadcastNotification: (req: Request, res: Response) => Promise<void>;
export declare const getBroadcastHistory: (req: Request, res: Response) => Promise<void>;
/**
 * ── ADMIN PAYOUTS & DISBURSEMENTS ──
 */
export declare const getAllPayouts: (req: Request, res: Response) => Promise<void>;
export declare const updatePayoutStatus: (req: Request, res: Response) => Promise<void>;
/**
 * ── TOGGLE PROPERTY PHYSICAL VERIFICATION BADGE ──
 */
export declare const togglePropertyPhysicalVerification: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map