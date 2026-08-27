import { Request, Response } from 'express';
export declare const requestPayout: (req: Request, res: Response) => Promise<void>;
export declare const getPayoutHistory: (req: Request, res: Response) => Promise<void>;
export declare const handleTransferWebhook: (req: Request, res: Response) => Promise<void>;
/**
 * Verify Mobile Money / Bank Account Holder Name via Paystack Resolution API
 */
export declare const verifyMoMoAccountName: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=payout.controller.d.ts.map