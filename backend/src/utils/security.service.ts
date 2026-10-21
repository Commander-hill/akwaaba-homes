import crypto from 'crypto';

/**
 * Generates an expiring signed URL token for sensitive document access (Ghana Cards, etc.)
 * Expiration defaults to 60 minutes for administrative review sessions.
 */
export const generateSignedDocumentUrl = (rawUrl: string | null, expiresMinutes = 60): string | null => {
  if (!rawUrl) return null;

  // If already signed proxy URL, return as-is
  if (rawUrl.includes('/secure-document')) {
    return rawUrl;
  }

  const expires = Date.now() + expiresMinutes * 60 * 1000;
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'akwaaba-homes-secret-key-2026' : '');
  if (!secret) {
    throw new Error('JWT_SECRET must be configured to generate secure signed URLs.');
  }

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${rawUrl}:${expires}`)
    .digest('hex');

  const proxyUrl = `/api/v1/upload/secure-document?url=${encodeURIComponent(rawUrl)}&expires=${expires}&signature=${signature}`;
  return proxyUrl;
};

/**
 * Verifies an HMAC signature and expiration timestamp for a signed document URL.
 */
export const verifySignedDocumentUrl = (url: string, expiresStr: string, signatureStr: string): { valid: boolean; error?: string } => {
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
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${url}:${expires}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(signatureStr, 'utf8');

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return { valid: false, error: 'Invalid document signature' };
  }

  return { valid: true };
};

