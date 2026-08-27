import nodemailer from 'nodemailer';
export declare const getTransporter: () => nodemailer.Transporter<any, nodemailer.TransportOptions>;
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
export declare const notify: (params: NotifyParams) => Promise<void>;
export declare const notifyBookingCreated: (opts: {
    landlordId: string;
    landlordEmail: string;
    landlordName: string;
    tenantName: string;
    propertyTitle: string;
    bookingId: string;
}) => Promise<void>;
export declare const notifyPaymentReceipt: (opts: {
    tenantId: string;
    tenantEmail: string;
    tenantName: string;
    propertyTitle: string;
    amount: number;
    bookingId: string;
}) => Promise<void>;
export declare const notifyBookingStatusChanged: (opts: {
    tenantId: string;
    tenantEmail: string;
    tenantName: string;
    propertyTitle: string;
    status: string;
}) => Promise<void>;
export declare const notifySubscriptionExpirySoon: (opts: {
    landlordId: string;
    landlordEmail: string;
    landlordName: string;
    expiryDate: Date;
    daysLeft: number;
}) => Promise<void>;
export declare const notifyPropertyApproval: (opts: {
    landlordId: string;
    landlordEmail: string;
    landlordName: string;
    propertyTitle: string;
    status: 'APPROVED' | 'REJECTED';
    reason?: string;
}) => Promise<void>;
export declare const notifyAdminAnnouncement: (opts: {
    userIds: string[];
    emailList: {
        email: string;
        name: string;
    }[];
    subject: string;
    message: string;
}) => Promise<void>;
export declare const notifyAgreementCompleted: (opts: {
    landlordEmail: string;
    landlordName: string;
    tenantEmail: string;
    tenantName: string;
    propertyTitle: string;
    bookingId: string;
    hash: string;
}) => Promise<void>;
export declare const notifyMaintenanceEnded: () => Promise<void>;
export declare const notifyPayoutSent: (opts: {
    landlordId: string;
    landlordEmail: string;
    landlordName: string;
    landlordPhone?: string;
    amount: number;
    bankOrNetwork: string;
    accountNumber: string;
}) => Promise<void>;
export declare const notifyLandlordVerification: (opts: {
    landlordId: string;
    landlordEmail: string;
    landlordName: string;
    landlordPhone?: string;
    isVerified: boolean;
    notes?: string;
}) => Promise<void>;
export {};
//# sourceMappingURL=notification.service.d.ts.map