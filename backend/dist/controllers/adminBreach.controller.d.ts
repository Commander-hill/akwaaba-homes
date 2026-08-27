import { Request, Response } from 'express';
/**
 * Fetch all contract breach reports for admin moderation
 */
export declare const getAdminBreachReports: (req: Request, res: Response) => Promise<void>;
/**
 * Resolve Breach Report with Reputation Deduction & Account Actions
 */
export declare const resolveBreachReport: (req: Request, res: Response) => Promise<void>;
/**
 * Fetch Landlord Deed / Ownership Document Audits
 */
export declare const getLandlordDeedAudits: (req: Request, res: Response) => Promise<void>;
/**
 * Audit Landlord Deed Document (Approve / Reject)
 */
export declare const auditLandlordDeed: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=adminBreach.controller.d.ts.map