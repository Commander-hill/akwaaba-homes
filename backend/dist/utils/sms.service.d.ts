/**
 * Normalizes Ghanaian phone numbers into standard international format (+233).
 * Examples:
 *   "0241234567" -> "+233241234567"
 *   "233241234567" -> "+233241234567"
 *   "+233241234567" -> "+233241234567"
 */
export declare function formatGhanaPhoneNumber(phone: string): string;
/**
 * Dispatches transactional SMS via Hubtel / Arkesel / SMS API with fallback.
 */
export declare function sendSMS(to: string, message: string): Promise<boolean>;
//# sourceMappingURL=sms.service.d.ts.map