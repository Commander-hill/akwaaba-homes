import { Request, Response } from 'express';
export declare const getSubscriptionStatus: (req: Request, res: Response) => Promise<void>;
export declare const initializePayment: (req: Request, res: Response) => Promise<void>;
export declare const verifyPayment: (req: Request, res: Response) => Promise<void>;
export declare const handlePaystackWebhook: (req: Request, res: Response) => Promise<void>;
export declare const checkExpirations: (req: Request, res: Response) => Promise<void>;
export declare const getLandlordSubscriptionsOverview: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=subscription.controller.d.ts.map