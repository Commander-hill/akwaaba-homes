import { Request, Response } from 'express';
/**
 * 4-Factor Roommate Compatibility Matching Algorithm
 */
export declare function calculateMatchScore(p1: any, p2: any): number;
/**
 * Get active roommate profiles sorted by compatibility match score
 */
export declare const getRoommateMatches: (req: Request, res: Response) => Promise<void>;
/**
 * Create or Update Current User's Roommate Profile
 */
export declare const upsertRoommateProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Send a Split Room Invitation to a Compatible Roommate
 */
export declare const sendRoommateInvitation: (req: Request, res: Response) => Promise<void>;
/**
 * Get Sent & Received Roommate Invitations
 */
export declare const getMyRoommateInvitations: (req: Request, res: Response) => Promise<void>;
/**
 * Respond to Roommate Invitation (ACCEPT or REJECT)
 */
export declare const respondToRoommateInvitation: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=roommate.controller.d.ts.map