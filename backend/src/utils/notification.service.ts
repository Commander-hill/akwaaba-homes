import nodemailer from 'nodemailer';
import prisma from './prisma';
import { sendSMS } from './sms.service';

import {
  renderInstitutionalEmail,
  emailButtonHtml,
  emailBadgeHtml,
  emailCardHtml,
  emailMetaTableHtml
} from './emailTemplate';

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
  recipientPhone?: string | null;
  type: 'BOOKING' | 'SUBSCRIPTION' | 'PROPERTY' | 'REVIEW' | 'ANNOUNCEMENT';
  title: string;
  message: string;
  link?: string;
  emailSubject: string;
  emailBodyHtml: string;
  smsText?: string;
}

export const notify = async (params: NotifyParams): Promise<void> => {
  const { userId, recipientEmail, recipientName, recipientPhone, type, title, message, link, emailSubject, emailBodyHtml, smsText } = params;

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
        from: `"AkwaabaHomes" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: emailSubject,
        html: emailBodyHtml
      });
      console.log(`✉️  [Notifications] Email sent to ${recipientEmail}: "${emailSubject}"`);
    } catch (err) {
      console.error(`[Notifications] Email delivery failed to ${recipientEmail}:`, err);
    }
  } else {
    console.log(`[Notifications] MOCK EMAIL → ${recipientEmail}: ${emailSubject}`);
  }

  // 3. Send SMS if phone number is available
  let phoneToUse = recipientPhone;
  if (!phoneToUse && userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true },
      });
      phoneToUse = user?.phoneNumber;
    } catch (err) {
      // Ignore
    }
  }

  if (phoneToUse && (smsText || message)) {
    const textToSend = smsText || `AkwaabaHomes: ${title} - ${message}`;
    sendSMS(phoneToUse, textToSend).catch((err) =>
      console.error(`[Notifications] SMS dispatch error:`, err)
    );
  }
};

// ─── Typed Notification Helpers ───────────────────────────────────────────────

export const notifyBookingCreated = async (opts: {
  landlordId: string; landlordEmail: string; landlordName: string;
  tenantName: string; propertyTitle: string; bookingId: string;
}) => {
  const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        New Booking Request
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, <strong>${opts.tenantName}</strong> has submitted a booking request for your property listing: <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Applicant Name', value: opts.tenantName },
        { label: 'Booking Reference', value: opts.bookingId, isMono: true },
        { label: 'Escrow Protection', value: 'Paystack Secured Deposit' }
      ])}
    `, 'Booking Details')}

    <p style="color:#52525B;font-size:13px;line-height:1.6;margin:16px 0;">
      Please review the tenant's details and move-in timeline in your Landlord Hub. You can approve the booking to proceed to the Tenancy Agreement, or decline to release the escrow hold.
    </p>

    ${emailButtonHtml({
      label: 'Review Booking in Dashboard',
      url: `${getFrontendUrl()}/dashboard/landlord`,
      variant: 'primary'
    })}

    <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-left:3px solid #0F5132;border-radius:6px;padding:12px 16px;margin-top:20px;">
      <p style="color:#71717A;font-size:12px;margin:0;line-height:1.5;">
        <strong>Escrow assurance:</strong> The tenant's payment is held securely in escrow. Payouts are transferred directly to your Mobile Money or bank account once the tenancy agreement is signed and keys are handed over.
      </p>
    </div>
  `;

  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    type: 'BOOKING',
    title: 'New Booking Request',
    message: `${opts.tenantName} has submitted a booking request for "${opts.propertyTitle}".`,
    link: '/dashboard/landlord',
    emailSubject: `New booking request: ${opts.propertyTitle}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'New Booking Request Received',
      preheader: `${opts.tenantName} requested to book ${opts.propertyTitle}`,
      categoryTag: 'BOOKING',
      bodyHtml
    })
  });
};

export const notifyPaymentReceipt = async (opts: {
  tenantId: string; tenantEmail: string; tenantName: string;
  propertyTitle: string; amount: number; bookingId: string;
}) => {
  const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Payment Receipt
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.tenantName}, thank you for your payment. Your rent deposit of <strong>GH₵ ${opts.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> has been received and is secured in escrow.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Amount Paid', value: `GH₵ ${opts.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true },
        { label: 'Booking Reference', value: opts.bookingId, isMono: true },
        { label: 'Escrow Status', value: 'Held in Escrow' }
      ])}
    `, 'Payment Summary')}

    <p style="color:#52525B;font-size:13px;line-height:1.6;margin:16px 0;">
      Your payment is held safely in escrow. If the landlord declines your booking or fails to confirm within the window, your payment will be <strong>automatically refunded in full (100%)</strong> to your original payment method.
    </p>

    ${emailButtonHtml({
      label: 'View Booking in Dashboard',
      url: `${getFrontendUrl()}/dashboard/tenant`,
      variant: 'primary'
    })}

    <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-left:3px solid #0F5132;border-radius:6px;padding:12px 16px;margin-top:20px;">
      <p style="color:#71717A;font-size:12px;margin:0;line-height:1.5;">
        <strong>Next steps:</strong> The landlord has been notified to review your booking. Once approved, you will sign your digital Tenancy Agreement to finalize your stay.
      </p>
    </div>
  `;

  await notify({
    userId: opts.tenantId,
    recipientEmail: opts.tenantEmail,
    recipientName: opts.tenantName,
    type: 'BOOKING',
    title: 'Booking Payment Receipt',
    message: `Your payment of GH₵ ${opts.amount} for "${opts.propertyTitle}" has been received into escrow.`,
    link: '/dashboard/tenant',
    emailSubject: `Payment receipt: GH₵ ${opts.amount.toLocaleString()} for ${opts.propertyTitle}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'Payment Confirmation & Receipt',
      preheader: `Payment confirmed: GH₵ ${opts.amount.toLocaleString()} for ${opts.propertyTitle}`,
      categoryTag: 'RECEIPT',
      bodyHtml
    })
  });
};

export const notifyBookingStatusChanged = async (opts: {
  tenantId: string; tenantEmail: string; tenantName: string;
  propertyTitle: string; status: string;
}) => {
  const isApproved = opts.status === 'APPROVED' || opts.status === 'CONFIRMED';
  const isRejected = opts.status === 'REJECTED' || opts.status === 'CANCELLED';

  const badgeColor = isApproved ? 'emerald' : isRejected ? 'rose' : 'gold';
  const statusTitle = isApproved ? 'Booking Confirmed' : isRejected ? 'Booking Declined' : `Booking Status: ${opts.status}`;

  const bodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${emailBadgeHtml({ label: 'STATUS', value: opts.status, variant: badgeColor })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        ${statusTitle}
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.tenantName}, the landlord has updated the status of your booking application for <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Booking Status', value: opts.status },
        { label: 'Next Action', value: isApproved ? 'Sign Tenancy Agreement' : isRejected ? '100% Refund Processed' : 'Under Review' }
      ])}
    `, 'Booking Status')}

    ${isApproved ? `
      <div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:14px 18px;margin:20px 0;">
        <h4 style="margin:0 0 4px;color:#166534;font-size:14px;font-weight:700;">Next Step: Tenancy Agreement</h4>
        <p style="margin:0;color:#15803D;font-size:13px;line-height:1.5;">
          Your booking is approved! Please review and sign your digital Tenancy Agreement in your resident portal to finalize your move-in.
        </p>
      </div>
    ` : ''}

    ${isRejected ? `
      <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:14px 18px;margin:20px 0;">
        <h4 style="margin:0 0 4px;color:#991B1B;font-size:14px;font-weight:700;">Full Escrow Refund</h4>
        <p style="margin:0;color:#B91C1C;font-size:13px;line-height:1.5;">
          Because this booking was declined by the property owner, your deposit has been released from escrow and a 100% refund has been processed back to your original payment channel.
        </p>
      </div>
    ` : ''}

    ${emailButtonHtml({
      label: 'Open Resident Portal',
      url: `${getFrontendUrl()}/dashboard/tenant`,
      variant: isApproved ? 'primary' : 'secondary'
    })}
  `;

  await notify({
    userId: opts.tenantId,
    recipientEmail: opts.tenantEmail,
    recipientName: opts.tenantName,
    type: 'BOOKING',
    title: statusTitle,
    message: `Your booking for "${opts.propertyTitle}" has been ${opts.status.toLowerCase()}.${isRejected ? ' Your payment refund has been initiated.' : ''}`,
    link: '/dashboard/tenant',
    emailSubject: `Booking ${isApproved ? 'approved' : 'update'}: ${opts.propertyTitle}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: statusTitle,
      preheader: `Your booking status for ${opts.propertyTitle} is now ${opts.status}`,
      categoryTag: 'UPDATE',
      bodyHtml
    })
  });
};

export const notifySubscriptionExpirySoon = async (opts: {
  landlordId: string; landlordEmail: string; landlordName: string;
  expiryDate: Date; daysLeft: number;
}) => {
  const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Listing Subscription Renewal Notice
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, your AkwaabaHomes landlord subscription will expire on <strong>${opts.expiryDate.toLocaleDateString('en-GB')}</strong> (${opts.daysLeft} day(s) remaining).
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Expiry Date', value: opts.expiryDate.toLocaleDateString('en-GB'), highlight: true },
        { label: 'Days Remaining', value: `${opts.daysLeft} Day(s)` },
        { label: 'Listing Status', value: opts.daysLeft > 0 ? 'Active & Searchable' : 'Suspended' }
      ])}
    `, 'Subscription Details')}

    <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-left:3px solid #D97706;border-radius:6px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#71717A;font-size:12px;line-height:1.5;">
        <strong>Notice:</strong> When your subscription expires, your property listings will be temporarily hidden from search results until renewed.
      </p>
    </div>

    ${emailButtonHtml({
      label: 'Renew Subscription',
      url: `${getFrontendUrl()}/dashboard/landlord/subscription`,
      variant: 'primary'
    })}
  `;

  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    type: 'SUBSCRIPTION',
    title: 'Subscription Expiring Soon',
    message: `Your subscription expires in ${opts.daysLeft} day(s) on ${opts.expiryDate.toLocaleDateString()}.`,
    link: '/dashboard/landlord/subscription',
    emailSubject: `Your listing subscription expires in ${opts.daysLeft} day(s)`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'Subscription Renewal Notice',
      preheader: `Your AkwaabaHomes subscription expires in ${opts.daysLeft} days`,
      categoryTag: 'SUBSCRIPTION',
      bodyHtml
    })
  });
};

export const notifyPropertyApproval = async (opts: {
  landlordId: string; landlordEmail: string; landlordName: string;
  propertyTitle: string; status: 'APPROVED' | 'REJECTED'; reason?: string;
}) => {
  const isApproved = opts.status === 'APPROVED';

  const bodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${emailBadgeHtml({
          label: 'VERIFICATION',
          value: isApproved ? 'APPROVED & LIVE' : 'ACTION REQUIRED',
          variant: isApproved ? 'emerald' : 'rose'
        })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        ${isApproved ? 'Property Listing Approved' : 'Property Listing Requires Updates'}
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, our verification team has completed the review of your property listing for <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property Title', value: opts.propertyTitle, highlight: true },
        { label: 'Review Decision', value: isApproved ? 'Approved' : 'Revision Required' }
      ])}
      ${opts.reason ? `
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #E4E4E7;">
          <strong style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.4px;">Reviewer Notes:</strong>
          <p style="margin:4px 0 0;font-size:13px;color:#18181B;line-height:1.5;">${opts.reason}</p>
        </div>
      ` : ''}
    `, 'Listing Review')}

    ${isApproved ? `
      <div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:12px 16px;margin:20px 0;">
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.5;">
          Your listing is now live. Verified tenants and university students can now browse your property, inspect units, and submit booking requests.
        </p>
      </div>
    ` : ''}

    ${emailButtonHtml({
      label: 'Manage Properties in Dashboard',
      url: `${getFrontendUrl()}/dashboard/landlord/properties`,
      variant: isApproved ? 'primary' : 'secondary'
    })}
  `;

  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    type: 'PROPERTY',
    title: `Property ${isApproved ? 'Approved' : 'Rejected'}`,
    message: `Your property "${opts.propertyTitle}" has been ${isApproved ? 'approved and is now live' : 'rejected by an administrator'}.`,
    link: '/dashboard/landlord/properties',
    emailSubject: `Property listing ${isApproved ? 'approved and live' : 'requires updates'}: ${opts.propertyTitle}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: `Property Listing ${isApproved ? 'Approved' : 'Review Decision'}`,
      preheader: `Listing status for ${opts.propertyTitle}: ${opts.status}`,
      categoryTag: 'PROPERTY',
      bodyHtml
    })
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
    const bodyHtml = `
      <div style="margin-bottom:20px;">
        <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 12px;line-height:1.3;">
          ${opts.subject}
        </h2>
      </div>

      <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-radius:8px;padding:20px;margin:16px 0;color:#3F3F46;font-size:14px;line-height:1.7;white-space:pre-wrap;">${opts.message}</div>

      <div style="margin-top:20px;padding-top:14px;border-top:1px solid #E4E4E7;color:#71717A;font-size:12px;">
        Sent by <strong>AkwaabaHomes Community Team</strong>
      </div>
    `;

    const emailHtml = renderInstitutionalEmail({
      title: opts.subject,
      preheader: opts.subject,
      categoryTag: 'ANNOUNCEMENT',
      bodyHtml
    });

    for (const recipient of opts.emailList) {
      try {
        await transporter.sendMail({
          from: `"AkwaabaHomes" <${process.env.SMTP_USER}>`,
          to: recipient.email,
          subject: `${opts.subject} — AkwaabaHomes`,
          html: emailHtml
        });
      } catch (err) {
        console.error(`[Notifications] Broadcast failed to ${recipient.email}:`, err);
      }
    }
    console.log(`✉️  [Notifications] Broadcast sent to ${opts.emailList.length} user(s)`);
  }
};

export const notifyAgreementCompleted = async (opts: {
  landlordEmail: string; landlordName: string;
  tenantEmail: string; tenantName: string;
  propertyTitle: string;
  bookingId: string;
  hash: string;
}) => {
  const subject = `Signed Tenancy Agreement: ${opts.propertyTitle}`;

  const generateBody = (recipientRole: 'LANDLORD' | 'TENANT', recipientName: string) => `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${emailBadgeHtml({ label: 'STATUS', value: 'SIGNED BY BOTH PARTIES', variant: 'emerald' })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Tenancy Agreement Signed
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${recipientName}, both the Landlord and Tenant have digitally signed the Tenancy Agreement for <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Landlord', value: opts.landlordName },
        { label: 'Tenant', value: opts.tenantName },
        { label: 'Verification Hash', value: opts.hash.slice(0, 24) + '...', isMono: true, highlight: true }
      ])}
    `, 'Agreement Summary')}

    <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-left:3px solid #0F5132;border-radius:6px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#71717A;font-size:12px;line-height:1.5;">
        <strong>Legal notice:</strong> Under Ghana's Electronic Transactions Act, 2008 (Act 772), this digital agreement is legally binding. You can download and print an official copy anytime from your dashboard.
      </p>
    </div>

    ${emailButtonHtml({
      label: 'View Signed Agreement',
      url: `${getFrontendUrl()}/dashboard/${recipientRole === 'LANDLORD' ? 'landlord' : 'tenant'}`,
      variant: 'primary'
    })}
  `;

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"AkwaabaHomes Tenancies" <${process.env.SMTP_USER}>`,
        to: opts.landlordEmail,
        subject: subject,
        html: renderInstitutionalEmail({
          title: 'Tenancy Agreement Signed',
          preheader: `Tenancy Agreement for ${opts.propertyTitle} has been signed by both parties.`,
          categoryTag: 'AGREEMENT',
          bodyHtml: generateBody('LANDLORD', opts.landlordName)
        })
      });
      await transporter.sendMail({
        from: `"AkwaabaHomes Tenancies" <${process.env.SMTP_USER}>`,
        to: opts.tenantEmail,
        subject: subject,
        html: renderInstitutionalEmail({
          title: 'Tenancy Agreement Signed',
          preheader: `Tenancy Agreement for ${opts.propertyTitle} has been signed by both parties.`,
          categoryTag: 'AGREEMENT',
          bodyHtml: generateBody('TENANT', opts.tenantName)
        })
      });
      console.log(`✉️  [Notifications] Agreement completed emails sent to ${opts.landlordEmail} and ${opts.tenantEmail}`);
    } catch (err) {
      console.error(`[Notifications] Agreement email delivery failed:`, err);
    }
  }
};

export const notifyMaintenanceEnded = async () => {
  try {
    const subscribers = await prisma.maintenanceSubscriber.findMany({
      where: { notified: false }
    });

    if (subscribers.length === 0) return;

    const transporter = getTransporter();
    const frontendUrl = getFrontendUrl();
    const bodyHtml = `
      <div style="margin-bottom:20px;">
        <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
          Maintenance Complete — We Are Back Online
        </h2>
        <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
          Our scheduled system upgrade has finished. All services, room bookings, and escrow transactions are fully operational.
        </p>
      </div>

      ${emailButtonHtml({
        label: 'Return to AkwaabaHomes',
        url: frontendUrl,
        variant: 'primary'
      })}
    `;

    const emailHtml = renderInstitutionalEmail({
      title: 'Platform Maintenance Complete',
      preheader: 'AkwaabaHomes is back online and all systems are operational.',
      categoryTag: 'SYSTEM UPDATE',
      bodyHtml
    });

    for (const sub of subscribers) {
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"AkwaabaHomes" <${process.env.SMTP_USER}>`,
            to: sub.email,
            subject: 'AkwaabaHomes is back online',
            html: emailHtml
          });
        } catch (err) {
          console.error(`Failed to send maintenance end email to ${sub.email}:`, err);
        }
      } else {
        console.log(`[Maintenance Email Mock] → ${sub.email}: AkwaabaHomes is Back Online!`);
      }
    }

    await prisma.maintenanceSubscriber.updateMany({
      where: { id: { in: subscribers.map(s => s.id) } },
      data: { notified: true }
    });
  } catch (err) {
    console.error('Error notifying maintenance subscribers:', err);
  }
};

export const notifyPayoutSent = async (opts: {
  landlordId: string;
  landlordEmail: string;
  landlordName: string;
  landlordPhone?: string;
  amount: number;
  bankOrNetwork: string;
  accountNumber: string;
}) => {
  const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Payout Dispatched
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, your requested rental withdrawal of <strong>GH₵ ${opts.amount.toFixed(2)}</strong> has been sent to your account.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Destination', value: `${opts.bankOrNetwork} (${opts.accountNumber})` },
        { label: 'Amount Sent', value: `GH₵ ${opts.amount.toFixed(2)}`, highlight: true },
        { label: 'Transfer Method', value: 'Mobile Money / Bank Transfer' }
      ])}
    `, 'Payout Details')}

    ${emailButtonHtml({
      label: 'View Payout History',
      url: `${getFrontendUrl()}/dashboard/landlord`,
      variant: 'primary'
    })}
  `;

  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    recipientPhone: opts.landlordPhone,
    type: 'SUBSCRIPTION',
    title: 'Payout Dispatched',
    message: `Your withdrawal of GH₵ ${opts.amount.toFixed(2)} to ${opts.bankOrNetwork} (${opts.accountNumber}) has been processed.`,
    link: '/dashboard/landlord/financials',
    emailSubject: `Payout confirmed: GH₵ ${opts.amount.toFixed(2)} to ${opts.bankOrNetwork}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'Payout Confirmation',
      preheader: `GH₵ ${opts.amount.toFixed(2)} sent to your ${opts.bankOrNetwork} account`,
      categoryTag: 'PAYOUT',
      bodyHtml
    }),
    smsText: `AkwaabaHomes: GH₵ ${opts.amount.toFixed(2)} payout sent to your ${opts.bankOrNetwork} (${opts.accountNumber}). Funds should reflect shortly.`
  });
};

export const notifyLandlordVerification = async (opts: {
  landlordId: string;
  landlordEmail: string;
  landlordName: string;
  landlordPhone?: string;
  isVerified: boolean;
  notes?: string;
}) => {
  const statusStr = opts.isVerified ? 'VERIFIED' : 'ACTION REQUIRED';
  const badgeColor = opts.isVerified ? 'emerald' : 'rose';

  const bodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${emailBadgeHtml({ label: 'VERIFICATION', value: statusStr, variant: badgeColor })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        ${opts.isVerified ? 'Landlord Verification Approved' : 'Verification Update Required'}
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, our verification team has reviewed your property ownership documentation.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Status', value: opts.isVerified ? 'Approved' : 'Action Required', highlight: true },
        { label: 'Badge Status', value: opts.isVerified ? 'Verified Landlord Badge Active' : 'Pending Updates' }
      ])}
      ${opts.notes ? `
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #E4E4E7;">
          <strong style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.4px;">Review Notes:</strong>
          <p style="margin:4px 0 0;font-size:13px;color:#18181B;line-height:1.5;">${opts.notes}</p>
        </div>
      ` : ''}
    `, 'Verification Summary')}

    ${opts.isVerified ? `
      <div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:12px 16px;margin:20px 0;">
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.5;">
          The official <strong>Verified Landlord</strong> badge is now displayed on all your listings, helping build trust with prospective students and tenants.
        </p>
      </div>
    ` : ''}

    ${emailButtonHtml({
      label: 'Open Verification Portal',
      url: `${getFrontendUrl()}/dashboard/verification`,
      variant: opts.isVerified ? 'primary' : 'secondary'
    })}
  `;

  await notify({
    userId: opts.landlordId,
    recipientEmail: opts.landlordEmail,
    recipientName: opts.landlordName,
    recipientPhone: opts.landlordPhone,
    type: 'ANNOUNCEMENT',
    title: `Landlord Verification ${opts.isVerified ? 'Approved' : 'Updated'}`,
    message: opts.isVerified
      ? 'Congratulations! Your Landlord verification was approved. You now hold the Verified Landlord badge.'
      : `Your Landlord verification requires an update. Note: ${opts.notes || 'Please resubmit valid ownership deeds.'}`,
    link: '/dashboard/verification',
    emailSubject: `Landlord verification ${opts.isVerified ? 'approved' : 'update'} — AkwaabaHomes`,
    emailBodyHtml: renderInstitutionalEmail({
      title: `Landlord Verification ${opts.isVerified ? 'Approved' : 'Update Needed'}`,
      preheader: opts.isVerified ? 'Your Verified Landlord badge is active' : 'Please check your submitted verification documents',
      categoryTag: 'VERIFICATION',
      bodyHtml
    }),
    smsText: `AkwaabaHomes: Your Landlord verification is ${statusStr}.${opts.isVerified ? ' Verified Landlord badge is active!' : ''}`
  });
};
