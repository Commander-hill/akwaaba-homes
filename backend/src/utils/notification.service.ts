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
    const textToSend = smsText || `Akwaaba Homes: ${title} - ${message}`;
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
    <div style="margin-bottom:24px;">
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        New Tenancy Booking Offer Received
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${opts.landlordName}</strong>, prospective tenant <strong>${opts.tenantName}</strong> has submitted an official tenancy booking application for your property listing.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property Title', value: opts.propertyTitle, highlight: true },
        { label: 'Prospective Tenant', value: opts.tenantName },
        { label: 'Booking Protocol ID', value: opts.bookingId, isMono: true },
        { label: 'Statutory Regulatory Framework', value: 'Rent Act, 1963 (Act 220)' }
      ])}
    `, 'Application Metadata')}

    <p style="color:#475569;font-size:14px;line-height:1.7;margin:16px 0;">
      Please inspect the tenant's profile, verification status, and move-in timeline in your Landlord Command Center. You may approve the booking to issue the statutory tenancy agreement, or decline to release the escrow hold.
    </p>

    ${emailButtonHtml({
      label: 'Review Tenancy Offer in Command Center',
      url: `${getFrontendUrl()}/dashboard/landlord`,
      variant: 'primary'
    })}

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px;margin-top:24px;">
      <p style="color:#166534;font-size:13px;margin:0;line-height:1.6;">
        🛡️ <strong>Akwaaba Escrow Assurance:</strong> Tenant booking funds are held safely in escrow until you sign the Tenancy Agreement and key handover occurs.
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
    emailSubject: `Tenancy Application Received — ${opts.propertyTitle}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'Tenancy Application Received',
      preheader: `${opts.tenantName} submitted an application for ${opts.propertyTitle}`,
      categoryTag: 'TENANCY DISPATCH',
      bodyHtml
    })
  });
};


export const notifyPaymentReceipt = async (opts: {
  tenantId: string; tenantEmail: string; tenantName: string;
  propertyTitle: string; amount: number; bookingId: string;
}) => {
  const bodyHtml = `
    <div style="margin-bottom:24px;">
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        Official Tenancy Payment Receipt & Escrow Deposit
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${opts.tenantName}</strong>, your advance rent remittance of <strong>GHS ${opts.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> has been securely cleared into the Akwaaba Homes Escrow Trust.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property Title', value: opts.propertyTitle, highlight: true },
        { label: 'Amount Paid (Escrowed)', value: `GHS ${opts.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true },
        { label: 'Booking Protocol ID', value: opts.bookingId, isMono: true },
        { label: 'Escrow Status', value: 'FUNDS SECURED (HELD IN TRUST)' },
        { label: 'Statutory Authority', value: 'Rent Act, 1963 (Act 220)' }
      ])}
    `, 'Financial Itemization')}

    <p style="color:#475569;font-size:14px;line-height:1.7;margin:16px 0;">
      Your payment is held safely in escrow. If the Landlord declines or does not confirm your booking, your payment will be <strong>automatically refunded in full (100%)</strong> to your original payment channel.
    </p>

    ${emailButtonHtml({
      label: 'View Booking & Tenancy Ledger',
      url: `${getFrontendUrl()}/dashboard/tenant`,
      variant: 'primary'
    })}

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;margin-top:20px;">
      <p style="color:#64748B;font-size:12px;margin:0;line-height:1.6;">
        💡 <strong>Next Steps:</strong> The property owner has been notified. Once approved, you will execute your statutory tenancy agreement digitally with SHA-256 cryptographic integrity.
      </p>
    </div>
  `;

  await notify({
    userId: opts.tenantId,
    recipientEmail: opts.tenantEmail,
    recipientName: opts.tenantName,
    type: 'BOOKING',
    title: 'Booking Payment Receipt',
    message: `Your payment of GHS ${opts.amount} for "${opts.propertyTitle}" has been received into escrow.`,
    link: '/dashboard/tenant',
    emailSubject: `Payment Receipt — GHS ${opts.amount} (${opts.propertyTitle})`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'Official Payment Receipt',
      preheader: `Payment confirmed: GHS ${opts.amount} for ${opts.propertyTitle}`,
      categoryTag: 'ESCROW RECEIPT',
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
  const statusTitle = isApproved ? 'Booking Application Approved' : isRejected ? 'Booking Application Declined' : `Booking Status: ${opts.status}`;

  const bodyHtml = `
    <div style="margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        ${emailBadgeHtml({ label: 'STATUS UPDATE', value: opts.status, variant: badgeColor })}
      </div>
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        ${statusTitle}
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${opts.tenantName}</strong>, the landlord has updated the status of your tenancy booking application for <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property Title', value: opts.propertyTitle, highlight: true },
        { label: 'Resolution Status', value: opts.status },
        { label: 'Escrow Action', value: isApproved ? 'READY FOR TENANCY LEASE' : isRejected ? 'ESCROW REFUND INITIATED' : 'UNDER REVIEW' }
      ])}
    `, 'Resolution Dossier')}

    ${isApproved ? `
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 20px;margin:20px 0;">
        <h4 style="margin:0 0 8px;color:#166534;font-size:15px;font-weight:800;">🎉 Congratulations! Next: Digital Tenancy Agreement</h4>
        <p style="margin:0;color:#15803D;font-size:13px;line-height:1.6;">
          Your tenancy is secured. Please review and countersign your statutory Tenancy Agreement under Act 220 to finalize key handover.
        </p>
      </div>
    ` : ''}

    ${isRejected ? `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;margin:20px 0;">
        <h4 style="margin:0 0 8px;color:#991B1B;font-size:15px;font-weight:800;">💸 Full Refund Initiated</h4>
        <p style="margin:0;color:#B91C1C;font-size:13px;line-height:1.6;">
          Because this booking was declined by the property owner, your escrow deposit has been released and a 100% refund has been processed back to your original mobile money or bank account.
        </p>
      </div>
    ` : ''}

    ${emailButtonHtml({
      label: 'Open Tenant Dashboard',
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
    emailSubject: `Tenancy Status: ${opts.status} — ${opts.propertyTitle}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: statusTitle,
      preheader: `Your booking status for ${opts.propertyTitle} is now ${opts.status}`,
      categoryTag: 'STATUS UPDATE',
      bodyHtml
    })
  });
};

export const notifySubscriptionExpirySoon = async (opts: {
  landlordId: string; landlordEmail: string; landlordName: string;
  expiryDate: Date; daysLeft: number;
}) => {
  const bodyHtml = `
    <div style="margin-bottom:24px;">
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        Action Required: Property Listing Subscription Renewal
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${opts.landlordName}</strong>, your Akwaaba Homes Landlord Platform Subscription is scheduled to expire in <strong>${opts.daysLeft} day(s)</strong> on <strong>${opts.expiryDate.toLocaleDateString('en-GB')}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Expiry Date', value: opts.expiryDate.toLocaleDateString('en-GB'), highlight: true },
        { label: 'Grace Days Remaining', value: `${opts.daysLeft} Day(s)` },
        { label: 'Listing Visibility', value: opts.daysLeft > 0 ? 'ACTIVE (SEARCHABLE)' : 'SUSPENDED' },
        { label: 'Account Tier', value: 'Verified Landlord Host' }
      ])}
    `, 'Subscription Telemetry')}

    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;color:#92400E;font-size:13px;line-height:1.6;">
        ⚠️ <strong>Search Continuity Notice:</strong> Upon expiration, your properties will be temporarily deactivated from tenant search results and escrow bookings until your listing quota is renewed.
      </p>
    </div>

    ${emailButtonHtml({
      label: 'Renew Landlord Subscription',
      url: `${getFrontendUrl()}/dashboard/landlord/subscription`,
      variant: 'accent'
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
    emailSubject: `Renewal Notice: Platform Subscription Expiring in ${opts.daysLeft} Day(s)`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'Subscription Expiring Soon',
      preheader: `Your Akwaaba Homes subscription expires in ${opts.daysLeft} days`,
      categoryTag: 'LANDLORD SUBSCRIPTION',
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
    <div style="margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        ${emailBadgeHtml({
          label: 'VERIFICATION VERDICT',
          value: isApproved ? 'APPROVED & LIVE' : 'MODIFICATION REQUIRED',
          variant: isApproved ? 'emerald' : 'rose'
        })}
      </div>
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        ${isApproved ? 'Property Listing Approved & Live' : 'Property Listing Requires Update'}
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${opts.landlordName}</strong>, our statutory property audit board has concluded the review of your property listing: <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Property Title', value: opts.propertyTitle, highlight: true },
        { label: 'Compliance Status', value: isApproved ? 'STATUTORILY APPROVED' : 'RETURNED FOR REVISION' },
        { label: 'Regulatory Framework', value: 'Rent Act, 1963 (Act 220)' }
      ])}
      ${opts.reason ? `
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #E2E8F0;">
          <strong style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Auditor Assessment Notes:</strong>
          <p style="margin:6px 0 0;font-size:14px;color:#0F172A;line-height:1.6;">${opts.reason}</p>
        </div>
      ` : ''}
    `, 'Property Audit Dossier')}

    ${isApproved ? `
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
          ✅ <strong>Now Live in Ghana Directory:</strong> Verified tenants across Ghana can now view your listing, inspect amenities, and make advance rent escrow offers.
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
    emailSubject: `Property Audit: ${isApproved ? 'Approved & Live' : 'Action Required'} — ${opts.propertyTitle}`,
    emailBodyHtml: renderInstitutionalEmail({
      title: `Property Listing ${isApproved ? 'Approved' : 'Review Decision'}`,
      preheader: `Audit verdict for ${opts.propertyTitle}: ${opts.status}`,
      categoryTag: 'PROPERTY COMPLIANCE',
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
      <div style="margin-bottom:24px;">
        <div style="margin-bottom:12px;">
          ${emailBadgeHtml({ label: 'OFFICIAL COMMUNIQUÉ', value: 'GENERAL BROADCAST', variant: 'emerald' })}
        </div>
        <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 14px;line-height:1.3;">
          ${opts.subject}
        </h2>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:24px;margin:20px 0;color:#334155;font-size:15px;line-height:1.8;white-space:pre-wrap;">${opts.message}</div>

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;color:#64748B;font-size:13px;">
        Dispatched by: <strong>The Akwaaba Homes National Regulatory Secretariat</strong>
      </div>
    `;

    const emailHtml = renderInstitutionalEmail({
      title: opts.subject,
      preheader: opts.subject,
      categoryTag: 'PLATFORM CIRCULAR',
      bodyHtml
    });

    for (const recipient of opts.emailList) {
      try {
        await transporter.sendMail({
          from: `"Akwaaba Homes Secretariat" <${process.env.SMTP_USER}>`,
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

export const notifyAgreementCompleted = async (opts: {
  landlordEmail: string; landlordName: string;
  tenantEmail: string; tenantName: string;
  propertyTitle: string;
  bookingId: string;
  hash: string;
}) => {
  const subject = `Legally Executed: Tenancy Agreement for ${opts.propertyTitle}`;

  const generateBody = (recipientRole: 'LANDLORD' | 'TENANT', recipientName: string) => `
    <div style="margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        ${emailBadgeHtml({ label: 'STATUS', value: 'FULLY EXECUTED & COUNTERSIGNED', variant: 'emerald' })}
        ${emailBadgeHtml({ label: 'LEGAL STATUTE', value: 'ACT 220 & ACT 772', variant: 'slate' })}
      </div>
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        Official Tenancy Agreement Executed
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${recipientName}</strong>, this certified communique confirms that both the Landlord and Tenant have completed and digitally executed the Tenancy Agreement for <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Premises Title', value: opts.propertyTitle, highlight: true },
        { label: 'Booking Agreement ID', value: opts.bookingId, isMono: true },
        { label: 'Landlord Party', value: opts.landlordName },
        { label: 'Tenant Party', value: opts.tenantName },
        { label: 'Biometric Cryptographic Fingerprint', value: opts.hash, isMono: true, highlight: true }
      ])}
    `, 'Digital Execution Ledger')}

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
        🛡️ <strong>Statutory Evidentiary Record:</strong> Under the Electronic Transactions Act, 2008 (Act 772), Section 7, the digital signatures and SHA-256 fingerprint embedded herein possess full legal validity admissible before any Ghanaian Court or Rent Tribunal.
      </p>
    </div>

    ${emailButtonHtml({
      label: 'Download & View Certified Tenancy Agreement',
      url: `${getFrontendUrl()}/dashboard/${recipientRole === 'LANDLORD' ? 'landlord' : 'tenant'}`,
      variant: 'primary'
    })}
  `;

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Akwaaba Homes Legal Registry" <${process.env.SMTP_USER}>`,
        to: opts.landlordEmail,
        subject: subject,
        html: renderInstitutionalEmail({
          title: 'Tenancy Agreement Executed',
          preheader: `Tenancy Agreement for ${opts.propertyTitle} has been legally executed.`,
          categoryTag: 'LEGAL INSTRUMENT',
          bodyHtml: generateBody('LANDLORD', opts.landlordName)
        })
      });
      await transporter.sendMail({
        from: `"Akwaaba Homes Legal Registry" <${process.env.SMTP_USER}>`,
        to: opts.tenantEmail,
        subject: subject,
        html: renderInstitutionalEmail({
          title: 'Tenancy Agreement Executed',
          preheader: `Tenancy Agreement for ${opts.propertyTitle} has been legally executed.`,
          categoryTag: 'LEGAL INSTRUMENT',
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
      <div style="margin-bottom:24px;">
        <div style="margin-bottom:12px;">
          ${emailBadgeHtml({ label: 'SYSTEM TELEMETRY', value: 'ALL SYSTEMS OPERATIONAL', variant: 'emerald' })}
        </div>
        <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
          Scheduled Maintenance Concluded — We Are Back Online
        </h2>
        <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
          The scheduled infrastructure upgrade and system optimization have successfully completed. All escrow processing, tenancy arbitration tools, and property listings are fully operational.
        </p>
      </div>

      ${emailButtonHtml({
        label: 'Return to Akwaaba Homes',
        url: frontendUrl,
        variant: 'primary'
      })}
    `;

    const emailHtml = renderInstitutionalEmail({
      title: 'Platform Maintenance Concluded',
      preheader: 'Akwaaba Homes is fully back online and operational.',
      categoryTag: 'SYSTEM RECOVERY',
      bodyHtml
    });

    for (const sub of subscribers) {
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"Akwaaba Homes Operations" <${process.env.SMTP_USER}>`,
            to: sub.email,
            subject: 'System Online: Scheduled Platform Maintenance Complete',
            html: emailHtml
          });
        } catch (err) {
          console.error(`Failed to send maintenance end email to ${sub.email}:`, err);
        }
      } else {
        console.log(`[Maintenance Email Mock] → ${sub.email}: Akwaaba Homes is Back Online!`);
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
    <div style="margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        ${emailBadgeHtml({ label: 'DISBURSEMENT', value: 'PAYMENT CLEARED', variant: 'emerald' })}
      </div>
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        Landlord Rental Escrow Payout Dispatched
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${opts.landlordName}</strong>, your requested advance rent withdrawal of <strong>GHS ${opts.amount.toFixed(2)}</strong> has been successfully disbursed to your designated Ghanaian financial channel.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Disbursement Destination', value: `${opts.bankOrNetwork} (${opts.accountNumber})` },
        { label: 'Amount Remitted', value: `GHS ${opts.amount.toFixed(2)}`, highlight: true },
        { label: 'Settlement Speed', value: 'INSTANT PAYSTACK TRANSFER' },
        { label: 'Statutory Tax Reference', value: 'GRA 5% Withholding Tracked' }
      ])}
    `, 'Settlement Breakdown')}

    ${emailButtonHtml({
      label: 'View Financial Statement & GRA Tax Slip',
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
    message: `Your withdrawal of GHS ${opts.amount.toFixed(2)} to ${opts.bankOrNetwork} (${opts.accountNumber}) has been processed.`,
    link: '/dashboard/landlord/financials',
    emailSubject: `Disbursement Confirmed — GHS ${opts.amount.toFixed(2)} Transferred`,
    emailBodyHtml: renderInstitutionalEmail({
      title: 'Disbursement Confirmed',
      preheader: `GHS ${opts.amount.toFixed(2)} transferred to your ${opts.bankOrNetwork} account`,
      categoryTag: 'ESCROW DISBURSEMENT',
      bodyHtml
    }),
    smsText: `Akwaaba Homes: GHS ${opts.amount.toFixed(2)} payout sent to your ${opts.bankOrNetwork} (${opts.accountNumber}). Funds will reflect shortly.`
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
  const statusStr = opts.isVerified ? 'VERIFIED & CERTIFIED' : 'ACTION REQUIRED';
  const badgeColor = opts.isVerified ? 'emerald' : 'rose';

  const bodyHtml = `
    <div style="margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        ${emailBadgeHtml({ label: 'LANDS AUDIT', value: statusStr, variant: badgeColor })}
      </div>
      <h2 style="color:#0F172A;font-size:22px;font-weight:800;margin:0 0 10px;line-height:1.3;">
        ${opts.isVerified ? 'Land Title Deed Verified — Verified Host Badge Active' : 'Landlord Deed Verification Requires Correction'}
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">
        Dear <strong>${opts.landlordName}</strong>, the statutory property deed audit has concluded for your landlord account.
      </p>
    </div>

    ${emailCardHtml(`
      ${emailMetaTableHtml([
        { label: 'Auditor Verdict', value: statusStr, highlight: true },
        { label: 'Verification Badge', value: opts.isVerified ? 'VERIFIED LANDLORD 🛡️' : 'PENDING CORRECTION' },
        { label: 'Statutory Body', value: 'Lands Commission & NIA Ghana Card Protocol' }
      ])}
      ${opts.notes ? `
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #E2E8F0;">
          <strong style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Auditor Directive:</strong>
          <p style="margin:6px 0 0;font-size:14px;color:#0F172A;line-height:1.6;">${opts.notes}</p>
        </div>
      ` : ''}
    `, 'Title Deed Compliance Dossier')}

    ${opts.isVerified ? `
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
          🛡️ <strong>Verified Host Distinction:</strong> The official Verified Landlord seal is now prominently displayed across all your property listings, accelerating tenant trust and escrow booking requests.
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
    title: `Landlord Verification ${opts.isVerified ? 'Approved 🛡️' : 'Updated'}`,
    message: opts.isVerified
      ? 'Congratulations! Your Landlord Property Deed verification was approved. You now hold the Verified Host 🛡️ badge.'
      : `Your Landlord verification requires update. Note: ${opts.notes || 'Please resubmit valid ownership deeds.'}`,
    link: '/dashboard/verification',
    emailSubject: `Title Deed Audit: ${opts.isVerified ? 'Approved 🛡️' : 'Requires Action'} — Akwaaba Homes`,
    emailBodyHtml: renderInstitutionalEmail({
      title: `Landlord Deed Audit ${opts.isVerified ? 'Approved' : 'Correction Needed'}`,
      preheader: opts.isVerified ? 'Your Verified Host badge is active' : 'Please check your submitted ownership documents',
      categoryTag: 'LAND TITLE AUDIT',
      bodyHtml
    }),
    smsText: `Akwaaba Homes: Your Landlord Deed verification is ${statusStr}.${opts.isVerified ? ' Verified Host badge is active!' : ''}`
  });
};
