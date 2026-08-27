import { Request, Response } from 'express';
export interface FraudRiskReport {
    propertyId: string;
    title: string;
    location: string;
    landlordName: string;
    landlordEmail: string;
    landlordId: string;
    ghanaCardStatus: string;
    price: number;
    riskScore: number;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    flags: string[];
    createdAt: Date;
}
export declare const scanFraudRisk: (req: Request, res: Response) => Promise<void>;
export declare const resolveFraudAction: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=fraud.controller.d.ts.map