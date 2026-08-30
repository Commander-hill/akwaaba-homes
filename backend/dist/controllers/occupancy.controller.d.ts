import { Request, Response } from 'express';
/**
 * Get full visual Floorplan & Bed Occupancy Matrix for a property
 */
export declare const getPropertyOccupancyMatrix: (req: Request, res: Response) => Promise<void>;
/**
 * Update individual Bed status (e.g. mark bed as MAINTENANCE or AVAILABLE)
 */
export declare const updateBedStatus: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=occupancy.controller.d.ts.map