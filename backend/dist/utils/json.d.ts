/**
 * Safely parse JSON values with defensive fallback handling.
 * Prevents 500 internal server errors when handling legacy or malformed database fields.
 */
export declare const safeJsonParse: <T = any>(val: any, fallback?: T) => T;
//# sourceMappingURL=json.d.ts.map