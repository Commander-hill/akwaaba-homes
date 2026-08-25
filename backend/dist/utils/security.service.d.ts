/**
 * Generates an expiring signed URL token for sensitive document access (Ghana Cards, etc.)
 * Expiration defaults to 15 minutes.
 */
export declare const generateSignedDocumentUrl: (rawUrl: string | null, expiresMinutes?: number) => string | null;
/**
 * Verifies an HMAC signature and expiration timestamp for a signed document URL.
 */
export declare const verifySignedDocumentUrl: (url: string, expiresStr: string, signatureStr: string) => {
    valid: boolean;
    error?: string;
};
//# sourceMappingURL=security.service.d.ts.map