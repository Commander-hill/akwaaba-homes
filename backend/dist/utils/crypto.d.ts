/**
 * Encrypts sensitive string data using AES-256-CBC with a cryptographically random IV.
 * STRICT FAIL-CLOSED: Throws an error immediately upon any cryptographic failure.
 * NEVER falls back to returning raw unencrypted text to prevent sensitive data leakage.
 */
export declare const encryptData: (text: string) => string;
/**
 * Decrypts AES-256-CBC encrypted data formatted as "iv:ciphertext".
 */
export declare const decryptData: (text: string) => string;
/**
 * Masks a Ghana Card number for safe public display in API responses.
 * Example: "GHA-712345678-9" -> "GHA-•••••••78-9"
 */
export declare const maskGhanaCardNumber: (card: string | null | undefined) => string | null;
//# sourceMappingURL=crypto.d.ts.map