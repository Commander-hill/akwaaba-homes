/**
 * Normalizes Ghanaian and international phone numbers into standard E.164 format (+233...).
 * Examples:
 *   "0241234567" -> "+233241234567"
 *   "233241234567" -> "+233241234567"
 *   "+233241234567" -> "+233241234567"
 */
export declare function formatGhanaPhoneNumber(phone: string): string;
/**
 * Dispatches transactional SMS via Africa's Talking, Arkesel, Hubtel, or generic SMS gateway.
 */
export declare function sendSMS(to: string, message: string): Promise<boolean>;
//# sourceMappingURL=sms.service.d.ts.map