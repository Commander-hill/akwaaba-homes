import axios from 'axios';

/**
 * Normalizes Ghanaian and international phone numbers into standard E.164 format (+233...).
 * Examples:
 *   "0241234567" -> "+233241234567"
 *   "233241234567" -> "+233241234567"
 *   "+233241234567" -> "+233241234567"
 */
export function formatGhanaPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, ''); // Remove non-numeric characters
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  } else if (!cleaned.startsWith('233') && cleaned.length === 9) {
    cleaned = '233' + cleaned;
  }
  return '+' + cleaned;
}

/**
 * Dispatches transactional SMS via Africa's Talking, Arkesel, Hubtel, or generic SMS gateway.
 */
export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!to || !message) return false;

  const formattedPhone = formatGhanaPhoneNumber(to);
  const smsSenderId = process.env.SMS_SENDER_ID || process.env.AFRICASTALKING_FROM || 'AkwaabaHome';

  const atUsername = process.env.AFRICASTALKING_USERNAME;
  const atApiKey = process.env.AFRICASTALKING_API_KEY;
  const arkeselKey = process.env.ARKESEL_API_KEY;
  const hubtelSecret = process.env.HUBTEL_CLIENT_SECRET;
  const genericSmsKey = process.env.SMS_API_KEY;

  // If no SMS provider key is set, log mock SMS for local/dev environment
  if (
    !atApiKey &&
    !arkeselKey &&
    !hubtelSecret &&
    (!genericSmsKey || genericSmsKey.includes('replace_with') || genericSmsKey === 'mock_key')
  ) {
    console.log(`📱 [SMS Gateway - MOCK] → ${formattedPhone}: "${message}"`);
    return true;
  }

  try {
    // 1. Africa's Talking SMS API Gateway (Primary)
    if (atUsername && atApiKey) {
      const isSandbox = atUsername.toLowerCase() === 'sandbox';
      const atEndpoint = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      const params = new URLSearchParams();
      params.append('username', atUsername);
      params.append('to', formattedPhone);
      params.append('message', message);
      if (smsSenderId && smsSenderId !== 'AkwaabaHome' && !isSandbox) {
        params.append('from', smsSenderId);
      } else if (process.env.AFRICASTALKING_FROM) {
        params.append('from', process.env.AFRICASTALKING_FROM);
      }

      const response = await axios.post(atEndpoint, params.toString(), {
        headers: {
          apiKey: atApiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      });

      const recipients = response.data?.SMSMessageData?.Recipients || [];
      const status = recipients[0]?.status || 'Success';
      console.log(`📱 [SMS Gateway - Africa's Talking] Sent to ${formattedPhone} (Status: ${status})`);
      return true;
    }

    // 2. Arkesel Ghana SMS API Gateway
    if (arkeselKey) {
      await axios.get('https://sms.arkesel.com/sms/api', {
        params: {
          action: 'send-sms',
          api_key: arkeselKey,
          to: formattedPhone.replace('+', ''),
          from: smsSenderId,
          sms: message,
        },
      });
      console.log(`📱 [SMS Gateway - Arkesel] Sent to ${formattedPhone}`);
      return true;
    }

    // 3. Hubtel Ghana SMS API Gateway
    if (process.env.HUBTEL_CLIENT_ID && hubtelSecret) {
      const authHeader = Buffer.from(
        `${process.env.HUBTEL_CLIENT_ID}:${hubtelSecret}`
      ).toString('base64');

      await axios.post(
        'https://smsc.hubtel.com/v1/messages/send',
        {
          From: smsSenderId,
          To: formattedPhone.replace('+', ''),
          Content: message,
        },
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`📱 [SMS Gateway - Hubtel] Sent to ${formattedPhone}`);
      return true;
    }

    // 4. Generic HTTP POST SMS Gateway
    if (genericSmsKey) {
      await axios.post(
        process.env.SMS_GATEWAY_URL || 'https://api.mnotify.com/api/sms/quick',
        {
          recipient: [formattedPhone.replace('+', '')],
          sender: smsSenderId,
          message,
          is_schedule: false,
        },
        {
          headers: {
            Authorization: `Bearer ${genericSmsKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`📱 [SMS Gateway - Direct] Sent to ${formattedPhone}`);
      return true;
    }

    return false;
  } catch (err: any) {
    console.error(`❌ [SMS Gateway Error] Failed to send SMS to ${formattedPhone}:`, err?.response?.data || err.message);
    return false;
  }
}
