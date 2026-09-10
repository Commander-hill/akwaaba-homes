import { Request, Response } from 'express';
/**
 * Submit or Update Move-In / Move-Out Inspection Checklist
 */
export declare const createOrUpdateInspection: (req: Request, res: Response) => Promise<void>;
/**
 * Get Inspection Checklists for a Booking
 */
export declare const getBookingInspections: (req: Request, res: Response) => Promise<void>;
/**
 * Get Master Room Asset Vault Inventory for a Property
 */
export declare const getPropertyInventory: (req: Request, res: Response) => Promise<void>;
/**
 * Save Master Room Asset Vault Inventory for a Property
 */
export declare const savePropertyInventory: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=inspection.controller.d.ts.map