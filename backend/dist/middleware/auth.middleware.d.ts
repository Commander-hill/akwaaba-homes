import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: any;
            rawBody?: Buffer;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorizeRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * ── STEP-UP AUTHENTICATION (ACT 843 §20 & CYBER SECURITY ACT 1038) ──
 * Enforces cryptographic step-up re-authentication token for critical financial
 * and statutory deed governance operations.
 */
export declare const requireStepUpAuth: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map