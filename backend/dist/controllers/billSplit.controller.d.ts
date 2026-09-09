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
/**
 * Delete a bill split (creator or admin only, if not settled and no paid shares)
 */
export declare const deleteBillSplit: (req: Request, res: Response) => Promise<void>;
/**
 * Get all bill splits for a property (Landlord, Caretaker, Admin)
 */
export declare const getPropertyBillSplits: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=billSplit.controller.d.ts.map