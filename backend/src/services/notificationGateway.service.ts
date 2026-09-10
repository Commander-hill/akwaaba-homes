import prisma from '../utils/prisma';
import { getIO } from '../socket';
import { sendPushToUser } from './push.service';
import axios from 'axios';

export interface DispatchMessageOptions {
  userId?: string;
  phoneNumber?: string;
  email?: string;
  title: string;
  message: string;
  type?: 'ANNOUNCEMENT' | 'BOOKING' | 'MAINTENANCE' | 'PAYMENT' | 'ALERT';
  link?: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

export interface SMSGatewayResult {
  channel: 'SMS' | 'WHATSAPP_LINK' | 'IN_APP';
  success: boolean;
  provider?: string;
  recipient: string;
  fallbackUrl?: string;
  error?: string;
}

/**
 * Clean and format Ghanaian telephone numbers into E.164 standard (+233)
 */
export const formatGhanaianPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('233') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+233${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+233${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
};

/**
 * Universal Multi-Channel Dispatch Gateway
 * Dispatches In-App, Socket.io, Web Push, and SMS/WhatsApp
 */
export const dispatchNotification = async (options: DispatchMessageOptions): Promise<SMSGatewayResult> => {
  const { userId, phoneNumber, title, message, type = 'ANNOUNCEMENT', link, priority = 'NORMAL' } = options;

  // 1. In-App Notification & Socket.io Broadcast
  if (userId) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          link: link || '/dashboard/tenant'
        }
      });

      const io = getIO();
      if (io) {
        io.to(userId).emit('notification', {
          title,
          message,
          type,
          link: link || '/dashboard/tenant',
          priority
        });
      }
    } catch (err: any) {
      console.error('[NotificationGateway] In-App delivery failed:', err.message);
    }

    // 2. Web Push Notification
    try {
      await sendPushToUser(userId, {
        title,
        body: message,
        url: link || '/'
      });
    } catch (err: any) {
      console.error('[NotificationGateway] WebPush failed:', err.message);
    }
  }

  // 3. SMS / WhatsApp Dispatch
  const formattedPhone = phoneNumber ? formatGhanaianPhoneNumber(phoneNumber) : '';
  const cleanDigits = formattedPhone.replace(/[^0-9]/g, '');

  // If SMS Provider API keys exist in env (e.g. HUBTEL, TERMII, or TWILIO)
  const hubtelClientId = process.env.HUBTEL_CLIENT_ID;
  const hubtelClientSecret = process.env.HUBTEL_CLIENT_SECRET;
  const termiiApiKey = process.env.TERMII_API_KEY;

  if (termiiApiKey && formattedPhone) {
    try {
      await axios.post('https://api.ng.termii.com/api/sms/send', {
        to: formattedPhone,
        from: 'AkwaabaRent',
        sms: `${title}: ${message}`,
        type: 'plain',
        channel: 'generic',
        api_key: termiiApiKey
      }, { timeout: 4000 });

      return { channel: 'SMS', success: true, provider: 'Termii', recipient: formattedPhone };
    } catch (e: any) {
      console.warn('[NotificationGateway] Termii SMS dispatch failed, generating WhatsApp fallback');
    }
  }

  if (hubtelClientId && hubtelClientSecret && formattedPhone) {
    try {
      const authHeader = Buffer.from(`${hubtelClientId}:${hubtelClientSecret}`).toString('base64');
      await axios.post('https://smsc.hubtel.com/v1/messages/send', {
        From: 'AkwaabaRent',
        To: formattedPhone,
        Content: `${title}: ${message}`
      }, {
        headers: { Authorization: `Basic ${authHeader}` },
        timeout: 4000
      });

      return { channel: 'SMS', success: true, provider: 'Hubtel', recipient: formattedPhone };
    } catch (e: any) {
      console.warn('[NotificationGateway] Hubtel SMS dispatch failed, generating WhatsApp fallback');
    }
  }

  // Fallback: Generate Direct WhatsApp Deep Link
  const fullText = `*${title}*\n\n${message}\n\n_Sent via Akwaaba Homes Platform_`;
  const fallbackUrl = cleanDigits 
    ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent(fullText)}`
    : `https://wa.me/?text=${encodeURIComponent(fullText)}`;

  return {
    channel: 'WHATSAPP_LINK',
    success: true,
    recipient: formattedPhone || 'WhatsApp Deep-Link',
    fallbackUrl
  };
};

/**
 * Gate Pass 6-Digit PIN Dispatch
 */
export const dispatchVisitorGatePin = async (
  recipientPhone: string,
  visitorName: string,
  pinCode: string,
  propertyTitle: string,
  unitNumber?: string
) => {
  return await dispatchNotification({
    phoneNumber: recipientPhone,
    title: 'Gatehouse Access Clearance PIN',
    message: `Guest access approved for ${visitorName} at ${propertyTitle}${unitNumber ? ` (${unitNumber})` : ''}. 6-Digit Gate PIN: ${pinCode}. Valid for single authorized entry.`,
    type: 'ALERT',
    priority: 'HIGH'
  });
};

/**
 * Rent Tranche Due Notification
 */
export const dispatchRentTrancheAlert = async (
  userId: string | undefined,
  recipientPhone: string,
  residentName: string,
  trancheTitle: string,
  amountGhs: number,
  dueDate: string,
  propertyTitle: string
) => {
  return await dispatchNotification({
    userId,
    phoneNumber: recipientPhone,
    title: '📅 Rent Installment Due Notice',
    message: `Hello ${residentName}, your ${trancheTitle} of GH₵ ${amountGhs.toFixed(2)} for ${propertyTitle} is due on ${dueDate}. Please ensure timely settlement via Mobile Money to maintain access clearance.`,
    type: 'PAYMENT',
    link: '/dashboard/tenant?tab=tranches',
    priority: 'HIGH'
  });
};

/**
 * Utility Submeter Bill Split Notice
 */
export const dispatchUtilityBillAlert = async (
  userId: string | undefined,
  recipientPhone: string,
  residentName: string,
  utilityType: string,
  amountGhs: number,
  propertyTitle: string
) => {
  return await dispatchNotification({
    userId,
    phoneNumber: recipientPhone,
    title: '⚡ Shared Utility Bill Split',
    message: `Hello ${residentName}, your share for ${utilityType} at ${propertyTitle} is GH₵ ${amountGhs.toFixed(2)}. Please confirm receipt and settle via MoMo escrow.`,
    type: 'PAYMENT',
    link: '/dashboard/tenant?tab=billsplit',
    priority: 'NORMAL'
  });
};

/**
 * Conduct / Estate Rule Violation Citation
 */
export const dispatchConductCitation = async (
  userId: string | undefined,
  recipientPhone: string,
  residentName: string,
  infraction: string,
  strikeLevel: number,
  refCode: string,
  propertyTitle: string,
  fineAmountGhs?: number
) => {
  let message = `Attention ${residentName}: Official citation ${refCode} issued at ${propertyTitle} regarding ${infraction} (Strike ${strikeLevel} of 3).`;
  if (fineAmountGhs && fineAmountGhs > 0) {
    message += ` A disciplinary surcharge of GH₵ ${fineAmountGhs.toFixed(2)} has been recorded.`;
  }

  return await dispatchNotification({
    userId,
    phoneNumber: recipientPhone,
    title: `⚖️ Community Conduct Citation (Strike ${strikeLevel})`,
    message,
    type: 'ALERT',
    link: '/dashboard/tenant',
    priority: 'HIGH'
  });
};
