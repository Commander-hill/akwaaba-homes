import { Request, Response } from 'express';
import { SupportedPaymentProvider } from '../services/payment/PaymentFactory';
export interface AuthRequest extends Request {
    user?: any;
    rawBody?: Buffer;
}
/**
 * Shared Idempotent Payment Processor
 * Atomically marks subscription active, publishes property, emits notifications, and clears cache.
 * Strictly guarantees idempotency: if already COMPLETED and active, it exits without duplicate side-effects.
 */
export declare const processSuccessfulSubscriptionPayment: (reference: string, amountPesewas: number, providerName: SupportedPaymentProvider) => Promise<{
    success: boolean;
    alreadyProcessed: boolean;
    subscription?: any;
}>;
/**
 * Get Subscription Status for a specific property
 */
export declare const getSubscriptionFee: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getSubscriptionStatus: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Initialize Subscription Payment
 * Supports Paystack and Hubtel payment gateways via PaymentFactory
 */
export declare const initializePayment: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Server-Side Payment Verification
 * Queries payment provider directly; validates amount, currency, and status.
 */
export declare const verifyPayment: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Paystack Webhook Handler (Idempotent)
 */
export declare const handlePaystackWebhook: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Hubtel Webhook Handler (Idempotent)
 */
export declare const handleHubtelWebhook: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Check and Process Expirations (Automated daily cron or admin trigger)
 */
export declare const checkExpirations: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get Landlord Subscriptions Overview for dashboard
 */
export declare const getLandlordSubscriptionsOverview: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=subscription.controller.d.ts.map