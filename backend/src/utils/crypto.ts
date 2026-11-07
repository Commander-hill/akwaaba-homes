import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * Returns a validated 32-byte Buffer for AES-256 encryption.
 * Enforces an independent, explicitly configured ENCRYPTION_KEY.
 */
const getKeyBuffer = (): Buffer => {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey || typeof rawKey !== 'string') {
    throw new Error('Fatal Cryptographic Configuration: ENCRYPTION_KEY environment variable is not defined.');
  }

  const trimmed = rawKey.trim();

  // If provided as a 64-character hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // If provided as exactly 32 raw UTF-8 bytes
  const utf8Buf = Buffer.from(trimmed, 'utf8');
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }

  // If in non-production environment with a custom string, hash to derive 32 bytes with high entropy
  if (process.env.NODE_ENV !== 'production' && trimmed.length >= 16) {
    return crypto.createHash('sha256').update(trimmed).digest();
  }

  throw new Error('Fatal Cryptographic Configuration: ENCRYPTION_KEY must be a 64-character hex string or 32-byte secret.');
};

/**
 * Encrypts sensitive string data using AES-256-CBC with a cryptographically random IV.
 * STRICT FAIL-CLOSED: Throws an error immediately upon any cryptographic failure.
 * NEVER falls back to returning raw unencrypted text to prevent sensitive data leakage.
 */
export const encryptData = (text: string): string => {
  if (!text) return text;

  try {
    const key = getKeyBuffer();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error: any) {
    console.error('🚨 [Security Violation] Strict Fail-Closed: Field encryption failed:', error.message);
    throw new Error('Cryptographic operation failed: sensitive data could not be securely encrypted.');
  }
};

/**
 * Decrypts AES-256-CBC encrypted data formatted as "iv:ciphertext".
 */
export const decryptData = (text: string): string => {
  if (!text) return text;
  if (!text.includes(':')) return text; // Plain text or legacy unencrypted string

  try {
    const key = getKeyBuffer();
    const textParts = text.split(':');
    const ivHex = textParts.shift() as string;
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const iv = Buffer.from(ivHex, 'hex');

    if (iv.length !== 16) {
      throw new Error('Invalid initialization vector length');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error: any) {
    console.error('🚨 Decryption error:', error.message);
    return '*** ENCRYPTED DATA CORRUPTED ***';
  }
};

/**
 * Masks a Ghana Card number for safe public display in API responses.
 * Example: "GHA-712345678-9" -> "GHA-•••••••78-9"
 */
export const maskGhanaCardNumber = (card: string | null | undefined): string | null => {
  if (!card) return null;
  const trimmed = card.trim();
  if (!trimmed) return null;

  // Standard Ghana Card format: GHA-123456789-0
  const match = trimmed.match(/^GHA-(\d{7})(\d{2})-(\d)$/i);
  if (match) {
    return `GHA-•••••••${match[2]}-${match[3]}`;
  }

  // Generic masking fallback: keep prefix and last 3 chars
  if (trimmed.length > 7) {
    const start = trimmed.slice(0, 4);
    const end = trimmed.slice(-3);
    const maskedCount = Math.min(8, trimmed.length - 7);
    return `${start}${'•'.repeat(maskedCount)}${end}`;
  }

  return 'GHA-•••••••••';
};
