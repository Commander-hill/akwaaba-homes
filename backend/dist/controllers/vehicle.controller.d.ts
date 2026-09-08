import { Request, Response } from 'express';
/**
 * Register a resident or guest vehicle
 */
export declare const registerVehicle: (req: Request, res: Response) => Promise<void>;
/**
 * Verify vehicle license plate at estate security gatehouse
 */
export declare const verifyVehiclePlate: (req: Request, res: Response) => Promise<void>;
/**
 * Get registered vehicles for a property (Landlord / Staff / Caretaker)
 */
export declare const getPropertyVehicles: (req: Request, res: Response) => Promise<void>;
/**
 * Get tenant's registered vehicles
 */
export declare const getTenantVehicles: (req: Request, res: Response) => Promise<void>;
/**
 * Delete / Deregister a vehicle
 */
export declare const deleteVehicle: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=vehicle.controller.d.ts.map