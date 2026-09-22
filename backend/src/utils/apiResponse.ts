import { Response, Request } from 'express';
import { ApiResponse, ApiErrorResponse, ErrorCode, ApiPaginationMeta, ApiFieldError } from '../types/api';

/**
 * Base Application Exception
 */
export class AppException extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly errors?: ApiFieldError[];

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = 'INTERNAL_SERVER_ERROR',
    errors?: ApiFieldError[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationException extends AppException {
  constructor(message: string = 'Validation failed', errors?: ApiFieldError[]) {
    super(message, 400, 'VALIDATION_ERROR', errors);
  }
}

export class AuthenticationException extends AppException {
  constructor(message: string = 'Authentication required', errorCode: ErrorCode = 'UNAUTHENTICATED') {
    super(message, 401, errorCode);
  }
}

export class AuthorizationException extends AppException {
  constructor(message: string = 'Access denied: Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundException extends AppException {
  constructor(message: string = 'Requested resource not found') {
    super(message, 404, 'RESOURCE_NOT_FOUND');
  }
}

export class ConflictException extends AppException {
  constructor(message: string = 'Business rule conflict occurred', errorCode: ErrorCode = 'BUSINESS_RULE_CONFLICT') {
    super(message, 409, errorCode);
  }
}

export class PaymentException extends AppException {
  constructor(message: string = 'Payment processing failed', errorCode: ErrorCode = 'PAYMENT_FAILED') {
    super(message, 402, errorCode);
  }
}

/**
 * Standardized API Response Helper
 */
export class ApiResponseHelper {
  static success<T>(
    res: Response,
    options: {
      message: string;
      data: T;
      meta?: ApiPaginationMeta;
      statusCode?: number;
    }
  ): void {
    const { message, data, meta, statusCode = 200 } = options;
    const responseBody: ApiResponse<T> = {
      success: true,
      message,
      data,
      ...(meta ? { meta } : {})
    };
    res.status(statusCode).json(responseBody);
  }

  static error(
    res: Response,
    options: {
      message: string;
      errorCode: ErrorCode;
      statusCode?: number;
      errors?: ApiFieldError[];
      req?: Request;
    }
  ): void {
    const { message, errorCode, statusCode = 400, errors, req } = options;
    const responseBody: ApiErrorResponse = {
      success: false,
      message,
      errorCode,
      ...(errors && errors.length > 0 ? { errors } : {}),
      timestamp: new Date().toISOString(),
      ...(req ? { path: req.originalUrl || req.url } : {})
    };
    res.status(statusCode).json(responseBody);
  }
}
