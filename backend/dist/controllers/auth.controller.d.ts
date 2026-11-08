import { Request, Response } from 'express';
export declare const checkEmailAvailability: (req: Request, res: Response) => Promise<void>;
export declare const CAMPUS_PROMO_CODES: Record<string, {
    campus: string;
    campusName: string;
    title: string;
    benefit: string;
    badgeText: string;
    badgeBg: string;
    badgeColor: string;
    badgeBorder: string;
}>;
export declare const verifyPromoCode: (req: Request, res: Response) => Promise<void>;
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const verifyEmail: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const login2FA: (req: Request, res: Response) => Promise<void>;
export declare const refresh: (req: Request, res: Response) => Promise<void>;
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const getMe: (req: Request, res: Response) => Promise<void>;
export declare const requestProfileUnlock: (req: Request, res: Response) => Promise<void>;
export declare const submitGhanaCard: (req: Request, res: Response) => Promise<void>;
export declare const submitLandlordVerification: (req: Request, res: Response) => Promise<void>;
export declare const submitStudentVerification: (req: Request, res: Response) => Promise<void>;
export declare const updateProfile: (req: Request, res: Response) => Promise<void>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<void>;
export declare const resetPassword: (req: Request, res: Response) => Promise<void>;
export declare const changePassword: (req: Request, res: Response) => Promise<void>;
export declare const get2FAStatus: (req: Request, res: Response) => Promise<void>;
export declare const setup2FA: (req: Request, res: Response) => Promise<void>;
export declare const enable2FA: (req: Request, res: Response) => Promise<void>;
export declare const disable2FA: (req: Request, res: Response) => Promise<void>;
/**
 * Send SMS OTP for 2FA Fallback Verification
 */
export declare const send2FASMS: (req: Request, res: Response) => Promise<void>;
/**
 * Verify SMS OTP for 2FA Activation / Fallback
 */
export declare const verify2FASMS: (req: Request, res: Response) => Promise<void>;
/**
 * Regenerate Emergency Recovery Codes for Enrolled User
 */
export declare const regenerateRecoveryCodes: (req: Request, res: Response) => Promise<void>;
/**
 * Completes mandatory TOTP 2FA enrollment for administrative accounts during login
 */
export declare const completeMandatory2FASetup: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map