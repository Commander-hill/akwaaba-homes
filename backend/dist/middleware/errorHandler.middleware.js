"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.globalErrorHandler = void 0;
const apiResponse_1 = require("../utils/apiResponse");
/**
 * Centralised error handler — catches all errors passed via next(err).
 * Strictly formats responses into the standardized ApiErrorResponse envelope.
 * Leaks NO stack traces in production.
 */
const globalErrorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = err.statusCode || 500;
    // Resolve Error Code
    let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
    if (statusCode === 400 && !err.errorCode)
        errorCode = 'VALIDATION_ERROR';
    if (statusCode === 401 && !err.errorCode)
        errorCode = 'UNAUTHENTICATED';
    if (statusCode === 403 && !err.errorCode)
        errorCode = 'FORBIDDEN';
    if (statusCode === 404 && !err.errorCode)
        errorCode = 'RESOURCE_NOT_FOUND';
    if (statusCode === 409 && !err.errorCode)
        errorCode = 'BUSINESS_RULE_CONFLICT';
    if (statusCode === 429 && !err.errorCode)
        errorCode = 'RATE_LIMIT_EXCEEDED';
    const message = isProduction && statusCode === 500
        ? 'An unexpected error occurred. Please try again later.'
        : (err.message || 'Internal server error');
    // Always log the full error on the server
    console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.originalUrl || req.url} — [${errorCode}] ${err.message}`);
    if (!isProduction && err.stack) {
        console.error(err.stack);
    }
    // Send standardized error response
    apiResponse_1.ApiResponseHelper.error(res, {
        message,
        errorCode,
        statusCode,
        errors: err.errors,
        req
    });
};
exports.globalErrorHandler = globalErrorHandler;
/**
 * Catch-all for unknown routes — 404 handler.
 */
const notFoundHandler = (req, res) => {
    apiResponse_1.ApiResponseHelper.error(res, {
        message: `Cannot ${req.method} ${req.originalUrl || req.url} — Route not found.`,
        errorCode: 'RESOURCE_NOT_FOUND',
        statusCode: 404,
        req
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.middleware.js.map