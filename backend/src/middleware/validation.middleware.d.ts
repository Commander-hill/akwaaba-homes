import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
export declare const validate: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const registerValidation: ValidationChain[];
export declare const loginValidation: ValidationChain[];
export declare const createPropertyValidation: ValidationChain[];
export declare const updatePropertyValidation: ValidationChain[];
//# sourceMappingURL=validation.middleware.d.ts.map