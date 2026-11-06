import { Request, Response, NextFunction } from 'express';
/**
 * Centralised error handler — catches all errors passed via next(err).
 * Strictly formats responses into the standardized ApiErrorResponse envelope.
 * Leaks NO stack traces in production.
 */
export declare const globalErrorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
/**
 * Catch-all for unknown routes — 404 handler.
 */
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=errorHandler.middleware.d.ts.map