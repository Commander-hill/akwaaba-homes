import { Request, Response } from 'express';
export declare const getLandlordCashflows: (req: Request, res: Response) => Promise<void>;
export declare const getTenantTransactions: (req: Request, res: Response) => Promise<void>;
export declare const getTransactionById: (req: Request, res: Response) => Promise<void>;
export declare const downloadReceiptPDF: (req: Request, res: Response) => Promise<void>;
export declare const getLandlordEarningsReport: (req: Request, res: Response) => Promise<void>;
export declare const handlePaystackWebhook: (req: Request, res: Response) => Promise<void>;
export interface FulfillPaymentParams {
    bookingId?: string;
    reference: string;
    paidAmountGhs?: number;
    channel?: string;
    ipAddress?: string;
    actorId?: string;
}
/**
 * ── IDEMPOTENT ATOMIC PAYMENT FULFILLMENT ──
 * Unified handler used by Webhooks, Polling Reconciliation, and Manual Verify
 */
export declare const fulfillBookingPayment: (params: FulfillPaymentParams) => Promise<{
    success: boolean;
    message: string;
    booking?: any;
    transaction?: any;
}>;
/**
 * Endpoint for Tenant or Admin to verify payment status on demand
 * Handles MoMo USSD ongoing/pending states with 202 status
 */
export declare const verifyPaymentStatus: (req: Request, res: Response) => Promise<void>;
/**
 * Fetch Landlord Financial Ledger (Gross Revenue, Maintenance Expense Deductions, 5% GRA Tax, Net Yield)
 */
export declare const getLandlordFinancialLedger: (req: Request, res: Response) => Promise<void>;
/**
 * Export GRA Tax Report (PDF or CSV)
 */
export declare const exportGRATaxReport: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=transaction.controller.d.ts.map