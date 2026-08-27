"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatGhanaPhoneNumber = formatGhanaPhoneNumber;
exports.sendSMS = sendSMS;
const axios_1 = __importDefault(require("axios"));
/**
 * Normalizes Ghanaian phone numbers into standard international format (+233).
 * Examples:
 *   "0241234567" -> "+233241234567"
 *   "233241234567" -> "+233241234567"
 *   "+233241234567" -> "+233241234567"
 */
function formatGhanaPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, ''); // Remove non-numeric characters
    if (cleaned.startsWith('0')) {
        cleaned = '233' + cleaned.substring(1);
    }
    else if (!cleaned.startsWith('233') && cleaned.length === 9) {
        cleaned = '233' + cleaned;
    }
    return '+' + cleaned;
}
/**
 * Dispatches transactional SMS via Hubtel / Arkesel / SMS API with fallback.
 */
async function sendSMS(to, message) {
    if (!to || !message)
        return false;
    const formattedPhone = formatGhanaPhoneNumber(to);
    const smsApiKey = process.env.SMS_API_KEY || process.env.ARKESEL_API_KEY || process.env.HUBTEL_CLIENT_SECRET;
    const smsSenderId = process.env.SMS_SENDER_ID || 'AkwaabaHome';
    // If no SMS provider key is set, log mock SMS for local/dev environment
    if (!smsApiKey || smsApiKey.includes('replace_with') || smsApiKey === 'mock_key') {
        console.log(`📱 [SMS Gateway - MOCK] → ${formattedPhone}: "${message}"`);
        return true;
    }
    try {
        // 1. Arkesel Ghana SMS API Gateway
        if (process.env.ARKESEL_API_KEY) {
            await axios_1.default.get('https://sms.arkesel.com/sms/api', {
                params: {
                    action: 'send-sms',
                    api_key: process.env.ARKESEL_API_KEY,
                    to: formattedPhone.replace('+', ''),
                    from: smsSenderId,
                    sms: message,
                },
            });
            console.log(`📱 [SMS Gateway - Arkesel] Sent to ${formattedPhone}`);
            return true;
        }
        // 2. Hubtel Ghana SMS API Gateway
        if (process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET) {
            const authHeader = Buffer.from(`${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`).toString('base64');
            await axios_1.default.post('https://smsc.hubtel.com/v1/messages/send', {
                From: smsSenderId,
                To: formattedPhone.replace('+', ''),
                Content: message,
            }, {
                headers: {
                    Authorization: `Basic ${authHeader}`,
                    'Content-Type': 'application/json',
                },
            });
            console.log(`📱 [SMS Gateway - Hubtel] Sent to ${formattedPhone}`);
            return true;
        }
        // 3. Generic HTTP POST SMS Gateway
        await axios_1.default.post(process.env.SMS_GATEWAY_URL || 'https://api.mnotify.com/api/sms/quick', {
            recipient: [formattedPhone.replace('+', '')],
            sender: smsSenderId,
            message,
            is_schedule: false,
        }, {
            headers: {
                Authorization: `Bearer ${smsApiKey}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`📱 [SMS Gateway - Direct] Sent to ${formattedPhone}`);
        return true;
    }
    catch (err) {
        console.error(`❌ [SMS Gateway Error] Failed to send SMS to ${formattedPhone}:`, err?.response?.data || err.message);
        return false;
    }
}
//# sourceMappingURL=sms.service.js.map