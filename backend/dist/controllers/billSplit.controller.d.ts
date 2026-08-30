import { Request, Response } from 'express';
/**
 * Create a new bill split
 */
export declare const createBillSplit: (req: Request, res: Response) => Promise<void>;
/**
 * Get tenant's bill splits (created or participated)
 */
export declare const getTenantBillSplits: (req: Request, res: Response) => Promise<void>;
/**
 * Toggle or mark a participant share as paid
 */
export declare const toggleParticipantPaidStatus: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=billSplit.controller.d.ts.map