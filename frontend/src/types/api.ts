/**
 * Shared API Contract Types (Frontend)
 * 
 * Synchronized with Backend API contracts to guarantee complete type safety
 * across TanStack Query fetches, mutations, and error handling.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'FORBIDDEN'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_SUSPENDED'
  | 'EMAIL_UNVERIFIED'
  | 'RESOURCE_NOT_FOUND'
  | 'BUSINESS_RULE_CONFLICT'
  | 'ALREADY_BOOKED'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: true;
  message: string;
  data: T;
  meta?: ApiPaginationMeta;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: ErrorCode;
  errors?: ApiFieldError[];
  timestamp: string;
  path?: string;
  requestId?: string;
}
