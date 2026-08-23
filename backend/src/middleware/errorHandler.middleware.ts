import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Centralised error handler — catches all errors passed via next(err).
 * Leaks NO stack traces in production.
 */
export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log the full error on the server
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.url} — ${err.message}`);
  if (!isProduction) {
    console.error(err.stack);
  }

  // Send a safe response to the client
  res.status(statusCode).json({
    status: 'error',
    message: isProduction && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

/**
 * Catch-all for unknown routes — 404 handler.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.url} — Route not found.`,
  });
};
