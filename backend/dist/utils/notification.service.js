"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyContactInquiry = exports.notifyLandlordVerification = exports.notifyPayoutSent = exports.notifyMaintenanceEnded = exports.notifyAgreementCompleted = exports.notifyAdminAnnouncement = exports.notifyPropertyApproval = exports.notifySubscriptionExpirySoon = exports.notifyBookingStatusChanged = exports.notifyPaymentReceipt = exports.notifyBookingCreated = exports.notify = exports.getTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = __importDefault(require("./prisma"));
const sms_service_1 = require("./sms.service");
const emailTemplate_1 = require("./emailTemplate");
const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';
// ─── Global SMTP Transporter (Pooled) ─────────────────────────────────────────
let transporterInstance = null;
const getTransporter = () => {
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_gmail_address@gmail.com')
        return null;
    if (transporterInstance)
        return transporterInstance;
    transporterInstance = nodemailer_1.default.createTransport({
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        service: 'gmail',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return transporterInstance;
};
exports.getTransporter = getTransporter;
const notify = async (params) => {
    const { userId, recipientEmail, recipientName, recipientPhone, type, title, message, link, emailSubject, emailBodyHtml, smsText } = params;
    // 1. Always persist in-app notification
    try {
        await prisma_1.default.notification.create({
            data: { userId, type, title, message, link: link || null }
        });
    }
    catch (err) {
        console.error('[Notifications] Failed to persist notification:', err);
    }
    // 2. Send email if SMTP is configured
    const transporter = (0, exports.getTransporter)();
    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"AkwaabaHomes" <${process.env.SMTP_USER}>`,
                to: recipientEmail,
                subject: emailSubject,
                html: emailBodyHtml
            });
            console.log(`✉️  [Notifications] Email sent to ${recipientEmail}: "${emailSubject}"`);
        }
        catch (err) {
            console.error(`[Notifications] Email delivery failed to ${recipientEmail}:`, err);
        }
    }
    else {
        console.log(`[Notifications] MOCK EMAIL → ${recipientEmail}: ${emailSubject}`);
    }
    // 3. Send SMS if phone number is available
    let phoneToUse = recipientPhone;
    if (!phoneToUse && userId) {
        try {
            const user = await prisma_1.default.user.findUnique({
                where: { id: userId },
                select: { phoneNumber: true },
            });
            phoneToUse = user?.phoneNumber;
        }
        catch (err) {
            // Ignore
        }
    }
    if (phoneToUse && (smsText || message)) {
        const textToSend = smsText || `AkwaabaHomes: ${title} - ${message}`;
        (0, sms_service_1.sendSMS)(phoneToUse, textToSend).catch((err) => console.error(`[Notifications] SMS dispatch error:`, err));
    }
};
exports.notify = notify;
// ─── Typed Notification Helpers ───────────────────────────────────────────────
const notifyBookingCreated = async (opts) => {
    const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        New Booking Request
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, <strong>${opts.tenantName}</strong> has submitted a booking request for your property listing: <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Applicant Name', value: opts.tenantName },
        { label: 'Booking Reference', value: opts.bookingId, isMono: true },
        { label: 'Payment Method', value: 'Paystack Checkout' }
    ])}
    `, 'Booking Details')}

    <p style="color:#52525B;font-size:13px;line-height:1.6;margin:16px 0;">
      Please review the tenant's details and move-in timeline in your Landlord Hub. You can approve the booking to proceed to the Tenancy Agreement, or decline the request.
    </p>

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'Review Booking in Dashboard',
        url: `${getFrontendUrl()}/dashboard/landlord`,
        variant: 'primary'
    })}

    <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-left:3px solid #16A34A;border-radius:6px;padding:12px 16px;margin-top:20px;">
      <p style="color:#71717A;font-size:12px;margin:0;line-height:1.5;">
        <strong>Settlement info:</strong> Rent payouts are transferred directly to your Mobile Money or bank account once the tenancy agreement is signed and check-in is completed.
      </p>
    </div>
  `;
    await (0, exports.notify)({
        userId: opts.landlordId,
        recipientEmail: opts.landlordEmail,
        recipientName: opts.landlordName,
        type: 'BOOKING',
        title: 'New Booking Request',
        message: `${opts.tenantName} has submitted a booking request for "${opts.propertyTitle}".`,
        link: '/dashboard/landlord',
        emailSubject: `New booking request: ${opts.propertyTitle}`,
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: 'New Booking Request Received',
            preheader: `${opts.tenantName} requested to book ${opts.propertyTitle}`,
            categoryTag: 'BOOKING',
            bodyHtml
        })
    });
};
exports.notifyBookingCreated = notifyBookingCreated;
const notifyPaymentReceipt = async (opts) => {
    const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Payment Receipt
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.tenantName}, thank you for your payment. Your rent payment of <strong>GH₵ ${opts.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> has been received and verified.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Amount Paid', value: `GH₵ ${opts.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true },
        { label: 'Booking Reference', value: opts.bookingId, isMono: true },
        { label: 'Payment Status', value: 'Verified & Confirmed' }
    ])}
    `, 'Payment Summary')}

    <p style="color:#52525B;font-size:13px;line-height:1.6;margin:16px 0;">
      Your rent payment is confirmed. If a booking is cancelled prior to check-in in accordance with platform policy, eligible refunds are processed back to your original payment method.
    </p>

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'View Booking in Dashboard',
        url: `${getFrontendUrl()}/dashboard/tenant`,
        variant: 'primary'
    })}

    <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-left:3px solid #16A34A;border-radius:6px;padding:12px 16px;margin-top:20px;">
      <p style="color:#71717A;font-size:12px;margin:0;line-height:1.5;">
        <strong>Next steps:</strong> Your official receipt and check-in clearance details are now available in your resident portal.
      </p>
    </div>
  `;
    await (0, exports.notify)({
        userId: opts.tenantId,
        recipientEmail: opts.tenantEmail,
        recipientName: opts.tenantName,
        type: 'BOOKING',
        title: 'Booking Payment Receipt',
        message: `Your payment of GH₵ ${opts.amount} for "${opts.propertyTitle}" has been confirmed.`,
        link: '/dashboard/tenant',
        emailSubject: `Payment receipt: GH₵ ${opts.amount.toLocaleString()} for ${opts.propertyTitle}`,
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: 'Payment Confirmation & Receipt',
            preheader: `Payment confirmed: GH₵ ${opts.amount.toLocaleString()} for ${opts.propertyTitle}`,
            categoryTag: 'RECEIPT',
            bodyHtml
        })
    });
};
exports.notifyPaymentReceipt = notifyPaymentReceipt;
const notifyBookingStatusChanged = async (opts) => {
    const isApproved = opts.status === 'APPROVED' || opts.status === 'CONFIRMED';
    const isRejected = opts.status === 'REJECTED' || opts.status === 'CANCELLED';
    const badgeColor = isApproved ? 'emerald' : isRejected ? 'rose' : 'gold';
    const statusTitle = isApproved ? 'Booking Confirmed' : isRejected ? 'Booking Declined' : `Booking Status: ${opts.status}`;
    const bodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${(0, emailTemplate_1.emailBadgeHtml)({ label: 'STATUS', value: opts.status, variant: badgeColor })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        ${statusTitle}
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.tenantName}, the landlord has updated the status of your booking application for <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Booking Status', value: opts.status },
        { label: 'Next Action', value: isApproved ? 'Sign Tenancy Agreement' : isRejected ? 'Application Closed' : 'Under Review' }
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
        <h4 style="margin:0 0 4px;color:#991B1B;font-size:14px;font-weight:700;">Booking Declined</h4>
        <p style="margin:0;color:#B91C1C;font-size:13px;line-height:1.5;">
          Because this booking was declined by the property owner, any payment associated with this reservation is automatically refunded back to your original payment channel.
        </p>
      </div>
    ` : ''}

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'Open Resident Portal',
        url: `${getFrontendUrl()}/dashboard/tenant`,
        variant: isApproved ? 'primary' : 'secondary'
    })}
  `;
    await (0, exports.notify)({
        userId: opts.tenantId,
        recipientEmail: opts.tenantEmail,
        recipientName: opts.tenantName,
        type: 'BOOKING',
        title: statusTitle,
        message: `Your booking for "${opts.propertyTitle}" has been ${opts.status.toLowerCase()}.${isRejected ? ' Your payment refund has been initiated.' : ''}`,
        link: '/dashboard/tenant',
        emailSubject: `Booking ${isApproved ? 'approved' : 'update'}: ${opts.propertyTitle}`,
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: statusTitle,
            preheader: `Your booking status for ${opts.propertyTitle} is now ${opts.status}`,
            categoryTag: 'UPDATE',
            bodyHtml
        })
    });
};
exports.notifyBookingStatusChanged = notifyBookingStatusChanged;
const notifySubscriptionExpirySoon = async (opts) => {
    const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Listing Subscription Renewal Notice
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, your AkwaabaHomes landlord subscription will expire on <strong>${opts.expiryDate.toLocaleDateString('en-GB')}</strong> (${opts.daysLeft} day(s) remaining).
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
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

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'Renew Subscription',
        url: `${getFrontendUrl()}/dashboard/landlord/subscription`,
        variant: 'primary'
    })}
  `;
    await (0, exports.notify)({
        userId: opts.landlordId,
        recipientEmail: opts.landlordEmail,
        recipientName: opts.landlordName,
        type: 'SUBSCRIPTION',
        title: 'Subscription Expiring Soon',
        message: `Your subscription expires in ${opts.daysLeft} day(s) on ${opts.expiryDate.toLocaleDateString()}.`,
        link: '/dashboard/landlord/subscription',
        emailSubject: `Your listing subscription expires in ${opts.daysLeft} day(s)`,
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: 'Subscription Renewal Notice',
            preheader: `Your AkwaabaHomes subscription expires in ${opts.daysLeft} days`,
            categoryTag: 'SUBSCRIPTION',
            bodyHtml
        })
    });
};
exports.notifySubscriptionExpirySoon = notifySubscriptionExpirySoon;
const notifyPropertyApproval = async (opts) => {
    const isApproved = opts.status === 'APPROVED';
    const bodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${(0, emailTemplate_1.emailBadgeHtml)({
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

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
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

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'Manage Properties in Dashboard',
        url: `${getFrontendUrl()}/dashboard/landlord/properties`,
        variant: isApproved ? 'primary' : 'secondary'
    })}
  `;
    await (0, exports.notify)({
        userId: opts.landlordId,
        recipientEmail: opts.landlordEmail,
        recipientName: opts.landlordName,
        type: 'PROPERTY',
        title: `Property ${isApproved ? 'Approved' : 'Rejected'}`,
        message: `Your property "${opts.propertyTitle}" has been ${isApproved ? 'approved and is now live' : 'rejected by an administrator'}.`,
        link: '/dashboard/landlord/properties',
        emailSubject: `Property listing ${isApproved ? 'approved and live' : 'requires updates'}: ${opts.propertyTitle}`,
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: `Property Listing ${isApproved ? 'Approved' : 'Review Decision'}`,
            preheader: `Listing status for ${opts.propertyTitle}: ${opts.status}`,
            categoryTag: 'PROPERTY',
            bodyHtml
        })
    });
};
exports.notifyPropertyApproval = notifyPropertyApproval;
const notifyAdminAnnouncement = async (opts) => {
    // Persist for all users
    await Promise.all(opts.userIds.map(userId => prisma_1.default.notification.create({
        data: { userId, type: 'ANNOUNCEMENT', title: opts.subject, message: opts.message }
    }).catch(() => { })));
    // Send emails to all recipients
    const transporter = (0, exports.getTransporter)();
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
        const emailHtml = (0, emailTemplate_1.renderInstitutionalEmail)({
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
            }
            catch (err) {
                console.error(`[Notifications] Broadcast failed to ${recipient.email}:`, err);
            }
        }
        console.log(`✉️  [Notifications] Broadcast sent to ${opts.emailList.length} user(s)`);
    }
};
exports.notifyAdminAnnouncement = notifyAdminAnnouncement;
const notifyAgreementCompleted = async (opts) => {
    const subject = `Signed Tenancy Agreement: ${opts.propertyTitle}`;
    const generateBody = (recipientRole, recipientName) => `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${(0, emailTemplate_1.emailBadgeHtml)({ label: 'STATUS', value: 'SIGNED BY BOTH PARTIES', variant: 'emerald' })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Tenancy Agreement Signed
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${recipientName}, both the Landlord and Tenant have digitally signed the Tenancy Agreement for <strong>${opts.propertyTitle}</strong>.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
        { label: 'Property', value: opts.propertyTitle, highlight: true },
        { label: 'Landlord', value: opts.landlordName },
        { label: 'Tenant', value: opts.tenantName },
        { label: 'Verification Hash', value: opts.hash.slice(0, 24) + '...', isMono: true, highlight: true }
    ])}
    `, 'Agreement Summary')}

    <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-left:3px solid #16A34A;border-radius:6px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#71717A;font-size:12px;line-height:1.5;">
        <strong>Legal notice:</strong> Under Ghana's Electronic Transactions Act, 2008 (Act 772), this digital agreement is legally binding. You can download and print an official copy anytime from your dashboard.
      </p>
    </div>

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'View Signed Agreement',
        url: `${getFrontendUrl()}/dashboard/${recipientRole === 'LANDLORD' ? 'landlord' : 'tenant'}`,
        variant: 'primary'
    })}
  `;
    const transporter = (0, exports.getTransporter)();
    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"AkwaabaHomes Tenancies" <${process.env.SMTP_USER}>`,
                to: opts.landlordEmail,
                subject: subject,
                html: (0, emailTemplate_1.renderInstitutionalEmail)({
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
                html: (0, emailTemplate_1.renderInstitutionalEmail)({
                    title: 'Tenancy Agreement Signed',
                    preheader: `Tenancy Agreement for ${opts.propertyTitle} has been signed by both parties.`,
                    categoryTag: 'AGREEMENT',
                    bodyHtml: generateBody('TENANT', opts.tenantName)
                })
            });
            console.log(`✉️  [Notifications] Agreement completed emails sent to ${opts.landlordEmail} and ${opts.tenantEmail}`);
        }
        catch (err) {
            console.error(`[Notifications] Agreement email delivery failed:`, err);
        }
    }
};
exports.notifyAgreementCompleted = notifyAgreementCompleted;
const notifyMaintenanceEnded = async () => {
    try {
        const subscribers = await prisma_1.default.maintenanceSubscriber.findMany({
            where: { notified: false }
        });
        if (subscribers.length === 0)
            return;
        const transporter = (0, exports.getTransporter)();
        const frontendUrl = getFrontendUrl();
        const bodyHtml = `
      <div style="margin-bottom:20px;">
        <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
          Maintenance Complete — We Are Back Online
        </h2>
        <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
          Our scheduled system upgrade has finished. All services, room bookings, and rent payment transactions are fully operational.
        </p>
      </div>

      ${(0, emailTemplate_1.emailButtonHtml)({
            label: 'Return to AkwaabaHomes',
            url: frontendUrl,
            variant: 'primary'
        })}
    `;
        const emailHtml = (0, emailTemplate_1.renderInstitutionalEmail)({
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
                }
                catch (err) {
                    console.error(`Failed to send maintenance end email to ${sub.email}:`, err);
                }
            }
            else {
                console.log(`[Maintenance Email Mock] → ${sub.email}: AkwaabaHomes is Back Online!`);
            }
        }
        await prisma_1.default.maintenanceSubscriber.updateMany({
            where: { id: { in: subscribers.map(s => s.id) } },
            data: { notified: true }
        });
    }
    catch (err) {
        console.error('Error notifying maintenance subscribers:', err);
    }
};
exports.notifyMaintenanceEnded = notifyMaintenanceEnded;
const notifyPayoutSent = async (opts) => {
    const bodyHtml = `
    <div style="margin-bottom:20px;">
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        Payout Dispatched
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, your requested rental withdrawal of <strong>GH₵ ${opts.amount.toFixed(2)}</strong> has been sent to your account.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
        { label: 'Destination', value: `${opts.bankOrNetwork} (${opts.accountNumber})` },
        { label: 'Amount Sent', value: `GH₵ ${opts.amount.toFixed(2)}`, highlight: true },
        { label: 'Transfer Method', value: 'Mobile Money / Bank Transfer' }
    ])}
    `, 'Payout Details')}

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'View Payout History',
        url: `${getFrontendUrl()}/dashboard/landlord`,
        variant: 'primary'
    })}
  `;
    await (0, exports.notify)({
        userId: opts.landlordId,
        recipientEmail: opts.landlordEmail,
        recipientName: opts.landlordName,
        recipientPhone: opts.landlordPhone,
        type: 'SUBSCRIPTION',
        title: 'Payout Dispatched',
        message: `Your withdrawal of GH₵ ${opts.amount.toFixed(2)} to ${opts.bankOrNetwork} (${opts.accountNumber}) has been processed.`,
        link: '/dashboard/landlord/withdraw',
        emailSubject: `Payout confirmed: GH₵ ${opts.amount.toFixed(2)} to ${opts.bankOrNetwork}`,
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: 'Payout Confirmation',
            preheader: `GH₵ ${opts.amount.toFixed(2)} sent to your ${opts.bankOrNetwork} account`,
            categoryTag: 'PAYOUT',
            bodyHtml
        }),
        smsText: `AkwaabaHomes: GH₵ ${opts.amount.toFixed(2)} payout sent to your ${opts.bankOrNetwork} (${opts.accountNumber}). Funds should reflect shortly.`
    });
};
exports.notifyPayoutSent = notifyPayoutSent;
const notifyLandlordVerification = async (opts) => {
    const statusStr = opts.isVerified ? 'VERIFIED' : 'ACTION REQUIRED';
    const badgeColor = opts.isVerified ? 'emerald' : 'rose';
    const bodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${(0, emailTemplate_1.emailBadgeHtml)({ label: 'VERIFICATION', value: statusStr, variant: badgeColor })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        ${opts.isVerified ? 'Landlord Verification Approved' : 'Verification Update Required'}
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.landlordName}, our verification team has reviewed your property ownership documentation.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
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

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: 'Open Verification Portal',
        url: `${getFrontendUrl()}/dashboard/verification`,
        variant: opts.isVerified ? 'primary' : 'secondary'
    })}
  `;
    await (0, exports.notify)({
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
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: `Landlord Verification ${opts.isVerified ? 'Approved' : 'Update Needed'}`,
            preheader: opts.isVerified ? 'Your Verified Landlord badge is active' : 'Please check your submitted verification documents',
            categoryTag: 'VERIFICATION',
            bodyHtml
        }),
        smsText: `AkwaabaHomes: Your Landlord verification is ${statusStr}.${opts.isVerified ? ' Verified Landlord badge is active!' : ''}`
    });
};
exports.notifyLandlordVerification = notifyLandlordVerification;
const CONTACT_SUBJECT_LABELS = {
    TENANCY_INQUIRY: 'Student Hostel / Accommodation Inquiry',
    LANDLORD_ONBOARDING: 'Landlord Property Registration',
    ESCROW_ASSISTANCE: 'MoMo & Payment Support',
    PAYMENT_ASSISTANCE: 'MoMo & Payment Support',
    DISPUTE_REPORT: 'Tenancy or Booking Dispute',
    OTHER: 'General Feedback'
};
const notifyContactInquiry = async (opts) => {
    const categoryLabel = CONTACT_SUBJECT_LABELS[opts.subject] || opts.subject || 'General Inquiry';
    const cleanEmail = opts.email.trim().toLowerCase();
    // 1. Find all Admin users and any matching user account for the sender
    const [admins, senderUser] = await Promise.all([
        prisma_1.default.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true }
        }),
        prisma_1.default.user.findUnique({
            where: { email: cleanEmail },
            select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true }
        })
    ]);
    // 2. Persist AuditLog record (linked to senderUser if registered, otherwise first admin)
    const auditUserId = senderUser?.id || admins[0]?.id;
    if (auditUserId) {
        try {
            await prisma_1.default.auditLog.create({
                data: {
                    userId: auditUserId,
                    action: 'CONTACT_INQUIRY_SUBMITTED',
                    entity: 'ContactInquiry',
                    entityId: opts.referenceId,
                    newData: JSON.stringify({
                        referenceId: opts.referenceId,
                        name: opts.name,
                        email: cleanEmail,
                        phone: opts.phone || null,
                        subject: opts.subject,
                        categoryLabel,
                        message: opts.message
                    }),
                    ipAddress: opts.ipAddress || null
                }
            });
        }
        catch (err) {
            console.error('[ContactInquiry] Failed to write AuditLog:', err);
        }
    }
    // 3. Notify all Admin users (In-App Notification + Email + SMS)
    const adminBodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${(0, emailTemplate_1.emailBadgeHtml)({ label: 'SUPPORT DESK', value: opts.referenceId, variant: 'emerald' })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        New Support Inquiry Received
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        <strong>${opts.name}</strong> has submitted an inquiry via the AkwaabaHomes Contact Portal.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
        { label: 'Reference ID', value: opts.referenceId, isMono: true, highlight: true },
        { label: 'Category', value: categoryLabel },
        { label: 'Sender Name', value: opts.name },
        { label: 'Sender Email', value: cleanEmail, isMono: true },
        { label: 'Phone / WhatsApp', value: opts.phone || 'Not provided', isMono: true }
    ])}
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #E4E4E7;">
        <strong style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.4px;">Inquiry Message:</strong>
        <p style="margin:6px 0 0;font-size:13px;color:#18181B;line-height:1.6;white-space:pre-wrap;">${opts.message}</p>
      </div>
    `, 'Inquiry Details')}

    ${(0, emailTemplate_1.emailButtonHtml)({
        label: `Reply to ${opts.name}`,
        url: `mailto:${cleanEmail}?subject=${encodeURIComponent(`Re: [${opts.referenceId}] ${categoryLabel} — AkwaabaHomes Support`)}`,
        variant: 'primary'
    })}
  `;
    await Promise.all(admins.map((admin) => (0, exports.notify)({
        userId: admin.id,
        recipientEmail: admin.email,
        recipientName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Admin',
        recipientPhone: admin.phoneNumber,
        type: 'ANNOUNCEMENT',
        title: `New Inquiry [${opts.referenceId}]: ${categoryLabel}`,
        message: `${opts.name} (${cleanEmail}${opts.phone ? ` · ${opts.phone}` : ''}): "${opts.message.slice(0, 140)}${opts.message.length > 140 ? '...' : ''}"`,
        link: '/admin/audit',
        emailSubject: `[${opts.referenceId}] ${categoryLabel} — ${opts.name}`,
        emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
            title: `New Support Inquiry: ${opts.referenceId}`,
            preheader: `${opts.name} submitted a ${categoryLabel} inquiry`,
            categoryTag: 'SUPPORT INQUIRY',
            bodyHtml: adminBodyHtml
        }),
        smsText: `AkwaabaHomes Support [${opts.referenceId}]: ${categoryLabel} from ${opts.name} (${opts.phone || cleanEmail}).`
    })));
    // 4. Send confirmation to the sender (In-App if registered + Email + SMS)
    const senderBodyHtml = `
    <div style="margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        ${(0, emailTemplate_1.emailBadgeHtml)({ label: 'ACKNOWLEDGED', value: opts.referenceId, variant: 'emerald' })}
      </div>
      <h2 style="color:#18181B;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
        We Have Received Your Inquiry
      </h2>
      <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0;">
        Hi ${opts.name}, thank you for contacting AkwaabaHomes Support. Your message has been logged with our Accra &amp; Kumasi support desk and assigned reference number <strong>${opts.referenceId}</strong>.
      </p>
    </div>

    ${(0, emailTemplate_1.emailCardHtml)(`
      ${(0, emailTemplate_1.emailMetaTableHtml)([
        { label: 'Reference Number', value: opts.referenceId, isMono: true, highlight: true },
        { label: 'Category', value: categoryLabel },
        { label: 'Contact Email', value: cleanEmail, isMono: true },
        ...(opts.phone ? [{ label: 'Phone / WhatsApp', value: opts.phone, isMono: true }] : [])
    ])}
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #E4E4E7;">
        <strong style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.4px;">Your Message:</strong>
        <p style="margin:6px 0 0;font-size:13px;color:#18181B;line-height:1.6;white-space:pre-wrap;">${opts.message}</p>
      </div>
    `, 'Submission Summary')}

    <p style="color:#52525B;font-size:13px;line-height:1.6;margin:16px 0;">
      A support specialist will respond via email or WhatsApp within 24 hours (Mon–Sat, 8:00 AM – 7:00 PM GMT).
    </p>
  `;
    if (senderUser) {
        await (0, exports.notify)({
            userId: senderUser.id,
            recipientEmail: cleanEmail,
            recipientName: opts.name,
            recipientPhone: opts.phone || senderUser.phoneNumber,
            type: 'ANNOUNCEMENT',
            title: `Support Inquiry Logged (${opts.referenceId})`,
            message: `We received your "${categoryLabel}" inquiry. Our support team will respond shortly.`,
            link: '/contact',
            emailSubject: `[${opts.referenceId}] We received your inquiry — AkwaabaHomes Support`,
            emailBodyHtml: (0, emailTemplate_1.renderInstitutionalEmail)({
                title: 'Support Inquiry Confirmation',
                preheader: `Your inquiry (${opts.referenceId}) has been logged with AkwaabaHomes Support`,
                categoryTag: 'SUPPORT DESK',
                bodyHtml: senderBodyHtml
            }),
            smsText: `AkwaabaHomes: Your support inquiry (${opts.referenceId}) has been received. Our team will reply via email/WhatsApp shortly.`
        });
    }
    else {
        // Unregistered visitor: send email + optional SMS directly
        const transporter = (0, exports.getTransporter)();
        if (transporter) {
            try {
                await transporter.sendMail({
                    from: `"AkwaabaHomes Support" <${process.env.SMTP_USER}>`,
                    to: cleanEmail,
                    subject: `[${opts.referenceId}] We received your inquiry — AkwaabaHomes Support`,
                    html: (0, emailTemplate_1.renderInstitutionalEmail)({
                        title: 'Support Inquiry Confirmation',
                        preheader: `Your inquiry (${opts.referenceId}) has been logged with AkwaabaHomes Support`,
                        categoryTag: 'SUPPORT DESK',
                        bodyHtml: senderBodyHtml
                    })
                });
            }
            catch (err) {
                console.error(`[ContactInquiry] Confirmation email failed to ${cleanEmail}:`, err);
            }
        }
        if (opts.phone) {
            (0, sms_service_1.sendSMS)(opts.phone, `AkwaabaHomes: Your support inquiry (${opts.referenceId}) has been received. Our team will reply via email/WhatsApp shortly.`).catch((err) => console.error('[ContactInquiry] SMS error:', err));
        }
    }
};
exports.notifyContactInquiry = notifyContactInquiry;
//# sourceMappingURL=notification.service.js.map