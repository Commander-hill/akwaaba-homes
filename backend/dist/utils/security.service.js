"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignedDocumentUrl = exports.generateSignedDocumentUrl = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates an expiring signed URL token for sensitive document access (Ghana Cards, etc.)
 * Expiration defaults to 15 minutes.
 */
const generateSignedDocumentUrl = (rawUrl, expiresMinutes = 15) => {
    if (!rawUrl)
        return null;
    // If already signed proxy URL, return as-is
    if (rawUrl.includes('/api/upload/secure-document') || rawUrl.includes('/upload/secure-document')) {
        return rawUrl;
    }
    const expires = Date.now() + expiresMinutes * 60 * 1000;
    const secret = process.env.JWT_SECRET || 'akwaaba-homes-secret-key-2026';
    const signature = crypto_1.default
        .createHmac('sha256', secret)
        .update(`${rawUrl}:${expires}`)
        .digest('hex');
    const proxyUrl = `/api/upload/secure-document?url=${encodeURIComponent(rawUrl)}&expires=${expires}&signature=${signature}`;
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
    const secret = process.env.JWT_SECRET || 'akwaaba-homes-secret-key-2026';
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(`${url}:${expires}`)
        .digest('hex');
    if (signatureStr !== expectedSignature) {
        return { valid: false, error: 'Invalid document signature' };
    }
    return { valid: true };
};
exports.verifySignedDocumentUrl = verifySignedDocumentUrl;
//# sourceMappingURL=security.service.js.map