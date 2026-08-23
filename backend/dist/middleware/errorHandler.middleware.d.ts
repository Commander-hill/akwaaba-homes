import { Request, Response, NextFunction } from 'express';
interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
/**
 * Centralised error handler — catches all errors passed via next(err).
 * Leaks NO stack traces in production.
 */
export declare const globalErrorHandler: (err: AppError, req: Request, res: Response, next: NextFunction) => void;
/**
 * Catch-all for unknown routes — 404 handler.
 */
export declare const notFoundHandler: (req: Request, res: Response) => void;
export {};
//# sourceMappingURL=errorHandler.middleware.d.ts.map