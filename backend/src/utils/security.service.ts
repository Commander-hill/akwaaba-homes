import crypto from 'crypto';

/**
 * Generates an expiring signed URL token for sensitive document access (Ghana Cards, etc.)
 * Expiration defaults to 15 minutes.
 */
export const generateSignedDocumentUrl = (rawUrl: string | null, expiresMinutes = 15): string | null => {
  if (!rawUrl) return null;

  // If already signed proxy URL, return as-is
  if (rawUrl.includes('/api/upload/secure-document') || rawUrl.includes('/upload/secure-document')) {
    return rawUrl;
  }

  const expires = Date.now() + expiresMinutes * 60 * 1000;
  const secret = process.env.JWT_SECRET || 'akwaaba-homes-secret-key-2026';

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${rawUrl}:${expires}`)
    .digest('hex');

  const proxyUrl = `/api/upload/secure-document?url=${encodeURIComponent(rawUrl)}&expires=${expires}&signature=${signature}`;
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

  const secret = process.env.JWT_SECRET || 'akwaaba-homes-secret-key-2026';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${url}:${expires}`)
    .digest('hex');

  if (signatureStr !== expectedSignature) {
    return { valid: false, error: 'Invalid document signature' };
  }

  return { valid: true };
};
