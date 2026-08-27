import { Request, Response } from 'express';
export declare const parseBedsPerRoom: (roomType: string) => number;
export declare const createProperty: (req: Request, res: Response) => Promise<void>;
export declare const getProperties: (req: Request, res: Response) => Promise<void>;
export declare const getPropertyById: (req: Request, res: Response) => Promise<void>;
export declare const updateProperty: (req: Request, res: Response) => Promise<void>;
export declare const deleteProperty: (req: Request, res: Response) => Promise<void>;
export declare const getLandlordProperties: (req: Request, res: Response) => Promise<void>;
export declare const getLandlordStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=property.controller.d.ts.map