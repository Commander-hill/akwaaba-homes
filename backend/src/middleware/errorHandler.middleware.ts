import { Request, Response, NextFunction } from 'express';
import { AppException, ApiResponseHelper } from '../utils/apiResponse';
import { ErrorCode } from '../types/api';

/**
 * Centralised error handler — catches all errors passed via next(err).
 * Strictly formats responses into the standardized ApiErrorResponse envelope.
 * Leaks NO stack traces in production.
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = err.statusCode || 500;
  let errorCode: ErrorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message: string = err.message || 'Internal server error';
  let errors = err.errors;

  // Normalize common library errors so raw DB/upload/JWT internals never leak to clients
  if (err?.code === 'P2002') {
    statusCode = 409;
    errorCode = 'BUSINESS_RULE_CONFLICT';
    message = 'A record with these details already exists.';
  } else if (err?.code === 'P2025') {
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
    message = 'The requested record could not be found.';
  } else if (err?.code === 'P2003') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid reference: related record does not exist.';
  } else if (err?.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file exceeds the maximum allowed size.'
        : 'File upload failed. Please check the file and try again.';
  } else if (err?.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Your session has expired. Please sign in again.';
  } else if (err?.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'UNAUTHENTICATED';
    message = 'Invalid authentication token. Please sign in again.';
  } else if (err?.name === 'ZodError' && Array.isArray(err.issues)) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.issues[0]?.message || 'Validation failed.';
    errors = err.issues.map((issue: any) => ({
      field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || ''),
      message: issue.message,
    }));
  }

  // Resolve Error Code from HTTP status if not explicitly set
  if (statusCode === 400 && errorCode === 'INTERNAL_SERVER_ERROR') errorCode = 'VALIDATION_ERROR';
  if (statusCode === 401 && errorCode === 'INTERNAL_SERVER_ERROR') errorCode = 'UNAUTHENTICATED';
  if (statusCode === 403 && errorCode === 'INTERNAL_SERVER_ERROR') errorCode = 'FORBIDDEN';
  if (statusCode === 404 && errorCode === 'INTERNAL_SERVER_ERROR') errorCode = 'RESOURCE_NOT_FOUND';
  if (statusCode === 409 && errorCode === 'INTERNAL_SERVER_ERROR') errorCode = 'BUSINESS_RULE_CONFLICT';
  if (statusCode === 429 && errorCode === 'INTERNAL_SERVER_ERROR') errorCode = 'RATE_LIMIT_EXCEEDED';

  if (isProduction && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  // Always log the full error on the server
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.originalUrl || req.url} — [${errorCode}] ${err.message}`);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  // Send standardized error response
  ApiResponseHelper.error(res, {
    message,
    errorCode,
    statusCode,
    errors,
    req
  });
};

/**
 * Catch-all for unknown routes — 404 handler.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponseHelper.error(res, {
    message: `Cannot ${req.method} ${req.originalUrl || req.url} — Route not found.`,
    errorCode: 'RESOURCE_NOT_FOUND',
    statusCode: 404,
    req
  });
};
