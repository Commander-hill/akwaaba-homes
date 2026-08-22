import nodemailer from 'nodemailer';
import prisma from './prisma';

// ─── Branded Email Template Builder ──────────────────────────────────────────
const emailTemplate = (title: string, preheader: string, bodyHtml: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Akwaaba<span style="color:#a5b4fc;">Homes</span></h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;">Student Accommodation Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Akwaaba Homes · University Student Accommodation</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:11px;">This is an automated message — please do not reply directly.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (text: string, href: string, color = '#4F46E5') =>
  `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="background:${color};color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">${text}</a>
  </div>`;

const badge = (label: string, value: string, color = '#EEF2FF', textColor = '#4F46E5') =>
  `<div style="display:inline-block;background:${color};color:${textColor};padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600;margin:4px 4px 4px 0;">${label}: <strong>${value}</strong></div>`;

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Global SMTP Transporter (Pooled) ─────────────────────────────────────────
let transporterInstance: nodemailer.Transporter | null = null;
export const getTransporter = () => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_gmail_address@gmail.com') return null;
  if (transporterInstance) return transporterInstance;
  
  transporterInstance = nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporterInstance;
};

// ─── Core Dispatch ────────────────────────────────────────────────────────────
interface NotifyParams {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  type: 'BOOKING' | 'SUBSCRIPTION' | 'PROPERTY' | 'REVIEW' | 'ANNOUNCEMENT';
  title: string;
  message: string;
  link?: string;
  emailSubject: string;
  emailBodyHtml: string;
}

export const notify = async (params: NotifyParams): Promise<void> => {
  const { userId, recipientEmail, recipientName, type, title, message, link, emailSubject, emailBodyHtml } = params;

  // 1. Always persist in-app notification
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, link: link || null }
    });
  } catch (err) {
    console.error('[Notifications] Failed to persist notification:', err);
  }

  // 2. Send email if SMTP is configured
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Akwaaba Homes" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: emailSubject,
        html: emailBodyHtml
      });
      console.log(`✉️  [Notifications] Email sent to ${recipientEmail}: "${emailSubject}"`);
    } catch (err) {
      console.error(`[Notifications] Email delivery failed to ${recipientEmail}:`, err);
    }
  } else {
    console.log(`[Notifications] MOCK → ${recipientEmail}: ${emailSubject}`);
  }
};

// ─── Typed Notification Helpers ───────────────────────────────────────────────

export const notifyBookingCreated = async (opts: {
  landlordId: string; landlordEmail: string; landlordName: string;
  tenantName: string; propertyTitle: string; bookingId: string;
}) => {
  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    type: 'BOOKING',
    title: 'New Booking Request',
    message: `${opts.tenantName} has submitted a booking request for "${opts.propertyTitle}".`,
    link: '/dashboard/landlord',
    emailSubject: `New Booking Request — ${opts.propertyTitle}`,
    emailBodyHtml: emailTemplate(
      'New Booking Request',
      `${opts.tenantName} wants to book your property`,
      `<h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">You have a new booking request!</h2>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Hello <strong>${opts.landlordName}</strong>,</p>
       <p style="color:#475569;font-size:15px;line-height:1.7;"><strong>${opts.tenantName}</strong> has submitted a booking request for your property:</p>
       ${badge('Property', opts.propertyTitle)}
       ${btn('Review Booking Request', `${getFrontendUrl()}/dashboard/landlord`)}
       <p style="color:#94a3b8;font-size:13px;text-align:center;">Log in to your Landlord Dashboard to accept or reject this request.</p>`
    )
  });
};

};

export const notifyPaymentReceipt = async (opts: {
  tenantId: string; tenantEmail: string; tenantName: string;
  propertyTitle: string; amount: number; bookingId: string;
}) => {
  await notify({
    userId: opts.tenantId,
    recipientEmail: opts.tenantEmail,
    recipientName: opts.tenantName,
    type: 'BOOKING',
    title: 'Booking Payment Receipt',
    message: `Your payment of GHS ${opts.amount} for "${opts.propertyTitle}" has been received.`,
    link: '/dashboard/tenant',
    emailSubject: `Payment Receipt — ${opts.propertyTitle}`,
    emailBodyHtml: emailTemplate(
      'Payment Receipt',
      `We have securely received your payment of GHS ${opts.amount}`,
      `<h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">Authentic Payment Receipt</h2>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Hello <strong>${opts.tenantName}</strong>,</p>
       <p style="color:#475569;font-size:15px;line-height:1.7;">This is a confirmation that your payment for the booking request has been successfully processed.</p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px;margin:20px 0;">
         <p style="margin:0 0 8px;"><strong>Property:</strong> ${opts.propertyTitle}</p>
         <p style="margin:0 0 8px;"><strong>Amount Paid:</strong> GHS ${opts.amount}</p>
         <p style="margin:0;"><strong>Booking ID:</strong> ${opts.bookingId}</p>
       </div>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Your request has been forwarded to the Landlord for approval. If the Landlord rejects your request, your payment will be <strong>automatically refunded in full</strong>.</p>
       ${btn('View My Bookings', \`\${getFrontendUrl()}/dashboard/tenant\`)}`
    )
  });
};

export const notifyPaymentReceipt = async (opts: {
  tenantId: string; tenantEmail: string; tenantName: string;
  propertyTitle: string; amount: number; bookingId: string;
}) => {
  await notify({
    userId: opts.tenantId,
    recipientEmail: opts.tenantEmail,
    recipientName: opts.tenantName,
    type: 'BOOKING',
    title: 'Booking Payment Receipt',
    message: `Your payment of GHS ${opts.amount} for "${opts.propertyTitle}" has been received.`,
    link: '/dashboard/tenant',
    emailSubject: `Payment Receipt — ${opts.propertyTitle}`,
    emailBodyHtml: emailTemplate(
      'Payment Receipt',
      `We have securely received your payment of GHS ${opts.amount}`,
      `<h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">Authentic Payment Receipt</h2>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Hello <strong>${opts.tenantName}</strong>,</p>
       <p style="color:#475569;font-size:15px;line-height:1.7;">This is a confirmation that your payment for the booking request has been successfully processed.</p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px;margin:20px 0;">
         <p style="margin:0 0 8px;"><strong>Property:</strong> ${opts.propertyTitle}</p>
         <p style="margin:0 0 8px;"><strong>Amount Paid:</strong> GHS ${opts.amount}</p>
         <p style="margin:0;"><strong>Booking ID:</strong> ${opts.bookingId}</p>
       </div>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Your request has been forwarded to the Landlord for approval. If the Landlord rejects your request, your payment will be <strong>automatically refunded in full</strong>.</p>
       ${btn('View My Bookings', \`\${getFrontendUrl()}/dashboard/tenant\`)}`
    )
  });
};

export const notifyBookingStatusChanged = async (opts: {
  tenantId: string; tenantEmail: string; tenantName: string;
  propertyTitle: string; status: string;
}) => {
  const isApproved = opts.status === 'APPROVED';
  const statusColor = isApproved ? '#059669' : opts.status === 'REJECTED' ? '#dc2626' : '#d97706';
  const statusBg = isApproved ? '#ecfdf5' : opts.status === 'REJECTED' ? '#fef2f2' : '#fffbeb';
  const title = `Booking ${opts.status === 'APPROVED' ? 'Accepted' : opts.status === 'REJECTED' ? 'Declined' : opts.status}`;

  await notify({
    userId: opts.tenantId,
    recipientEmail: opts.tenantEmail,
    recipientName: opts.tenantName,
    type: 'BOOKING',
    title,
    message: `Your booking for "${opts.propertyTitle}" has been ${opts.status.toLowerCase()}.${opts.status === 'REJECTED' ? ' Your payment will be automatically refunded.' : ''}`,
    link: '/dashboard/tenant',
    emailSubject: `Booking Update — ${opts.propertyTitle}`,
    emailBodyHtml: emailTemplate(
      title,
      `Your booking status has been updated to ${opts.status}`,
      `<h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">${title}</h2>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Hello <strong>${opts.tenantName}</strong>,</p>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Your booking request for <strong>${opts.propertyTitle}</strong> has been updated.</p>
       <div style="background:${statusBg};border:1px solid ${statusColor}33;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
         <span style="color:${statusColor};font-size:20px;font-weight:800;">${opts.status}</span>
       </div>
       ${opts.status === 'REJECTED' ? '<p style="color:#dc2626;font-size:15px;line-height:1.7;font-weight:600;">Since your request was rejected by the Landlord, a full refund of your payment has been automatically initiated and will reflect in your account shortly.</p>' : ''}
       ${isApproved ? `<p style="color:#475569;font-size:14px;">Congratulations! Your accommodation has been confirmed. Please proceed to complete your move-in arrangements.</p>` : ''}
       ${btn('View My Bookings', \`\${getFrontendUrl()}/dashboard/tenant\`)}` 
    )
  });
};

export const notifySubscriptionExpirySoon = async (opts: {
  landlordId: string; landlordEmail: string; landlordName: string;
  expiryDate: Date; daysLeft: number;
}) => {
  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    type: 'SUBSCRIPTION',
    title: 'Subscription Expiring Soon',
    message: `Your subscription expires in ${opts.daysLeft} day(s) on ${opts.expiryDate.toLocaleDateString()}.`,
    link: '/dashboard/landlord/subscription',
    emailSubject: `Action Required: Subscription Expiring in ${opts.daysLeft} Day(s)`,
    emailBodyHtml: emailTemplate(
      'Subscription Expiring Soon',
      `Your Akwaaba Homes subscription expires soon`,
      `<h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">Your subscription is expiring soon</h2>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Hello <strong>${opts.landlordName}</strong>,</p>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Your Akwaaba Homes landlord subscription is expiring in <strong>${opts.daysLeft} day(s)</strong>.</p>
       <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:20px;margin:20px 0;">
         ${badge('Expiry Date', opts.expiryDate.toLocaleDateString(), '#fef3c7', '#92400e')}
         ${badge('Days Remaining', String(opts.daysLeft), '#fef3c7', '#92400e')}
         <p style="color:#78350f;font-size:13px;margin:12px 0 0;">After expiry, your property listings will be hidden from tenant searches until your subscription is renewed.</p>
       </div>
       ${btn('Renew Subscription', `${getFrontendUrl()}/dashboard/landlord/subscription`, '#d97706')}`
    )
  });
};

export const notifyPropertyApproval = async (opts: {
  landlordId: string; landlordEmail: string; landlordName: string;
  propertyTitle: string; status: 'APPROVED' | 'REJECTED'; reason?: string;
}) => {
  const isApproved = opts.status === 'APPROVED';
  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    type: 'PROPERTY',
    title: `Property ${isApproved ? 'Approved' : 'Rejected'}`,
    message: `Your property "${opts.propertyTitle}" has been ${isApproved ? 'approved and is now live' : 'rejected by an administrator'}.`,
    link: '/dashboard/landlord/properties',
    emailSubject: `Property ${isApproved ? 'Approved ✓' : 'Rejected ✗'} — ${opts.propertyTitle}`,
    emailBodyHtml: emailTemplate(
      `Property ${isApproved ? 'Approved' : 'Rejected'}`,
      `Your property listing decision is ready`,
      `<h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">Property ${isApproved ? 'Approved ✓' : 'Rejected ✗'}</h2>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Hello <strong>${opts.landlordName}</strong>,</p>
       <p style="color:#475569;font-size:15px;line-height:1.7;">Your property listing <strong>${opts.propertyTitle}</strong> has been reviewed by our team.</p>
       <div style="background:${isApproved ? '#ecfdf5' : '#fef2f2'};border:1px solid ${isApproved ? '#6ee7b7' : '#fca5a5'};border-radius:12px;padding:16px;margin:20px 0;">
         <strong style="color:${isApproved ? '#059669' : '#dc2626'};font-size:16px;">${isApproved ? '✓ Your listing is now live on Akwaaba Homes!' : '✗ Your listing requires changes before approval.'}</strong>
         ${opts.reason ? `<p style="color:#475569;font-size:13px;margin:8px 0 0;">${opts.reason}</p>` : ''}
       </div>
       ${btn('View My Properties', `${getFrontendUrl()}/dashboard/landlord/properties`, isApproved ? '#059669' : '#4F46E5')}`
    )
  });
};

export const notifyAdminAnnouncement = async (opts: {
  userIds: string[]; emailList: { email: string; name: string }[];
  subject: string; message: string;
}) => {
  // Persist for all users
  await Promise.all(opts.userIds.map(userId =>
    prisma.notification.create({
      data: { userId, type: 'ANNOUNCEMENT', title: opts.subject, message: opts.message }
    }).catch(() => {})
  ));

  // Send emails to all recipients
  const transporter = getTransporter();
  if (transporter) {
    const emailHtml = emailTemplate(
      opts.subject, opts.subject,
      `<h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">📢 ${opts.subject}</h2>
       <p style="color:#475569;font-size:15px;line-height:1.8;white-space:pre-wrap;">${opts.message}</p>
       <p style="color:#94a3b8;font-size:13px;margin-top:24px;">— The Akwaaba Homes Administration Team</p>`
    );

    for (const recipient of opts.emailList) {
      try {
        await transporter.sendMail({
          from: `"Akwaaba Homes Admin" <${process.env.SMTP_USER}>`,
          to: recipient.email,
          subject: `📢 ${opts.subject} — Akwaaba Homes`,
          html: emailHtml
        });
      } catch (err) {
        console.error(`[Notifications] Broadcast failed to ${recipient.email}:`, err);
      }
    }
    console.log(`✉️  [Notifications] Broadcast sent to ${opts.emailList.length} user(s)`);
  }
};
