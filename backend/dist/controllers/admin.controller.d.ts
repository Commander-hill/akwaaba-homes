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
/** Create a landlord user account from the Admin Landlords workspace. */
export declare const createLandlord: (req: Request, res: Response) => Promise<void>;
/** Update basic landlord profile metadata from the Admin Landlords table. */
export declare const updateLandlordProfile: (req: Request, res: Response) => Promise<void>;
/** Create a tenant user account from the Admin Tenants workspace. */
export declare const createTenant: (req: Request, res: Response) => Promise<void>;
/** Update basic tenant profile metadata from the Admin Tenants table. */
export declare const updateTenantProfile: (req: Request, res: Response) => Promise<void>;
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
/**
 * ── UPDATE LANDLORD SETTLEMENT ACCOUNT (ACT 843 & STEP-UP AUTH PROTECTED) ──
 * Modifies payout method, mobile money provider/bank, and payout account number.
 * Protected by requireStepUpAuth.
 */
export declare const updateLandlordSettlement: (req: Request, res: Response) => Promise<void>;
/**
 * ── BULK MODERATION FOR PROPERTY LISTINGS (PEAK INTAKE WORKFLOW) ──
 * Allows multi-select bulk approval, rejection, or revision requests for properties
 * with a shared moderation note dispatched to landlords (Act 843 compliant).
 */
export declare const bulkUpdatePropertyApproval: (req: Request, res: Response) => Promise<void>;
/**
 * ── MANUAL ESCROW RECONCILIATION TRIGGER (PAYOUT RESILIENCE) ──
 * Allows financial officers to immediately force a status query to Paystack/Telcos
 * for stuck or pending MoMo/bank transfers and escrow deposits.
 */
export declare const reconcileManualEscrow: (req: Request, res: Response) => Promise<void>;
/**
 * ── LIVE SERVICE HEALTH HEARTBEAT (COMMAND CENTRE DIAGNOSTICS) ──
 * Evaluates real-time operational status, latencies, and connectivity of:
 * 1. PostgreSQL Database (Prisma ORM)
 * 2. Paystack API & Webhook Gateway
 * 3. Telco SMS & WhatsApp Hub (Arkesel / Twilio)
 * 4. Socket.io Real-Time Event Cluster
 */
export declare const getLiveHealthHeartbeat: (req: Request, res: Response) => Promise<void>;
/**
 * ── FAILED WEBHOOK DEAD LETTER QUEUE (DLQ) VIEWER ──
 * Retrieves dropped, rejected, or unhandled external webhooks with retry capabilities.
 */
export declare const getWebhookDLQ: (req: Request, res: Response) => Promise<void>;
/**
 * ── RETRY FAILED WEBHOOK DELIVERY (1-CLICK DLQ ACTION) ──
 * Re-submits a dead-lettered webhook payload for execution and marks it resolved.
 */
export declare const retryWebhookDelivery: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map