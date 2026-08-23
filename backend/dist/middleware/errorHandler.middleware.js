"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.globalErrorHandler = void 0;
/**
 * Centralised error handler — catches all errors passed via next(err).
 * Leaks NO stack traces in production.
 */
const globalErrorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
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
exports.globalErrorHandler = globalErrorHandler;
/**
 * Catch-all for unknown routes — 404 handler.
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot ${req.method} ${req.url} — Route not found.`,
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.middleware.js.map