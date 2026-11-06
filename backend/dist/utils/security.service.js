"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignedDocumentUrl = exports.generateSignedDocumentUrl = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates an expiring signed URL token for sensitive document access (Ghana Cards, etc.)
 * Expiration defaults to 60 minutes for administrative review sessions.
 */
const generateSignedDocumentUrl = (rawUrl, expiresMinutes = 60) => {
    if (!rawUrl)
        return null;
    // If already signed proxy URL, return as-is
    if (rawUrl.includes('/secure-document')) {
        return rawUrl;
    }
    const expires = Date.now() + expiresMinutes * 60 * 1000;
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'akwaaba-homes-secret-key-2026' : '');
    if (!secret) {
        throw new Error('JWT_SECRET must be configured to generate secure signed URLs.');
    }
    const signature = crypto_1.default
        .createHmac('sha256', secret)
        .update(`${rawUrl}:${expires}`)
        .digest('hex');
    const proxyUrl = `/api/v1/upload/secure-document?url=${encodeURIComponent(rawUrl)}&expires=${expires}&signature=${signature}`;
    return proxyUrl;
};
exports.generateSignedDocumentUrl = generateSignedDocumentUrl;
/**
 * Verifies an HMAC signature and expiration timestamp for a signed document URL.
 */
const verifySignedDocumentUrl = (url, expiresStr, signatureStr) => {
    if (!url || !expiresStr || !signatureStr) {
        return { valid: false, error: 'Missing security parameters' };
    }
    const expires = Number(expiresStr);
    if (isNaN(expires) || Date.now() > expires) {
        return { valid: false, error: 'Document access link has expired (15-minute expiration limit)' };
    }
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'akwaaba-homes-secret-key-2026' : '');
    if (!secret) {
        return { valid: false, error: 'Server security configuration error: JWT_SECRET not configured' };
    }
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(`${url}:${expires}`)
        .digest('hex');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signatureStr, 'utf8');
    if (expectedBuf.length !== actualBuf.length || !crypto_1.default.timingSafeEqual(expectedBuf, actualBuf)) {
        return { valid: false, error: 'Invalid document signature' };
    }
    return { valid: true };
};
exports.verifySignedDocumentUrl = verifySignedDocumentUrl;
//# sourceMappingURL=security.service.js.map