"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssSanitizer = void 0;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
/**
 * Recursively sanitizes strings, arrays, and objects to strip malicious HTML.
 */
const cleanData = (data) => {
    if (typeof data === 'string') {
        return (0, sanitize_html_1.default)(data, {
            allowedTags: [], // Strip all tags by default
            allowedAttributes: {}, // Strip all attributes
        });
    }
    if (Array.isArray(data)) {
        return data.map((item) => cleanData(item));
    }
    if (data !== null && typeof data === 'object') {
        const cleanedObject = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                cleanedObject[key] = cleanData(data[key]);
            }
        }
        return cleanedObject;
    }
    return data;
};
/**
 * Express middleware to sanitize incoming request data globally.
 */
const xssSanitizer = (req, res, next) => {
    if (req.body) {
        req.body = cleanData(req.body);
    }
    if (req.query) {
        Object.defineProperty(req, 'query', {
            value: cleanData(req.query),
            configurable: true,
            enumerable: true,
            writable: true
        });
    }
    if (req.params) {
        Object.defineProperty(req, 'params', {
            value: cleanData(req.params),
            configurable: true,
            enumerable: true,
            writable: true
        });
    }
    next();
};
exports.xssSanitizer = xssSanitizer;
//# sourceMappingURL=xss.middleware.js.map