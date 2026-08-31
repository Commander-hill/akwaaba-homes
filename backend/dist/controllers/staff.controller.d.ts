import { Request, Response } from 'express';
/**
 * Assign Staff (Caretaker/Porter/Manager) to a Property by Email
 */
export declare const assignStaff: (req: Request, res: Response) => Promise<void>;
/**
 * Get Staff assigned to Landlord's Properties
 */
export declare const getPropertyStaff: (req: Request, res: Response) => Promise<void>;
/**
 * Remove Staff Assignment
 */
export declare const removeStaff: (req: Request, res: Response) => Promise<void>;
/**
 * Get Properties and Operations assigned to the logged-in Caretaker/Staff
 */
export declare const getMyStaffAssignments: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=staff.controller.d.ts.map