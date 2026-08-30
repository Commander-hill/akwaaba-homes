import { Request, Response } from 'express';
/**
 * Post a new Compound Broadcast Notice to Residents
 */
export declare const createCompoundNotice: (req: Request, res: Response) => Promise<void>;
/**
 * Get active notices for a property (viewable by landlord and residents)
 */
export declare const getPropertyNotices: (req: Request, res: Response) => Promise<void>;
/**
 * Get all notices published by the current landlord
 */
export declare const getLandlordNotices: (req: Request, res: Response) => Promise<void>;
/**
 * Delete / Archive a notice
 */
export declare const deleteCompoundNotice: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=compoundNotice.controller.d.ts.map