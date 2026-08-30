import { Request, Response } from 'express';
/**
 * Generate a 1-Time Digital Visitor Gate Pass
 */
export declare const createVisitorPass: (req: Request, res: Response) => Promise<void>;
/**
 * Get tenant's visitor passes
 */
export declare const getTenantVisitorPasses: (req: Request, res: Response) => Promise<void>;
/**
 * Revoke a visitor pass
 */
export declare const revokeVisitorPass: (req: Request, res: Response) => Promise<void>;
/**
 * Verify Gate Pass (Security Guard / Porter endpoint)
 */
export declare const verifyGatePass: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=visitorPass.controller.d.ts.map