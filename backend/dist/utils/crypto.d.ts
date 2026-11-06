export declare const encryptData: (text: string) => string;
export declare const decryptData: (text: string) => string;
/**
 * Masks a Ghana Card number for safe public display in API responses.
 * Example: "GHA-712345678-9" -> "GHA-•••••••78-9"
 */
export declare const maskGhanaCardNumber: (card: string | null | undefined) => string | null;
//# sourceMappingURL=crypto.d.ts.map