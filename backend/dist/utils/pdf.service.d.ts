/**
 * Generate official signed Tenancy Agreement PDF
 */
export declare function generateTenancyAgreementPDF(data: {
    agreementId: string;
    bookingId: string;
    propertyTitle: string;
    propertyAddress: string;
    roomType: string;
    landlordName: string;
    landlordPhone: string;
    tenantName: string;
    tenantPhone: string;
    tenantEmail: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    cryptographicHash?: string | null;
    tenantSignedAt?: string | null;
    tenantSignatureUrl?: string | null;
    landlordSignedAt?: string | null;
    landlordSignatureUrl?: string | null;
}): Promise<Buffer>;
/**
 * Generate official Payment Receipt / Invoice PDF
 */
export declare function generateReceiptPDF(data: {
    transactionId: string;
    reference: string;
    studentName: string;
    studentEmail: string;
    studentPhone?: string | null;
    propertyTitle: string;
    roomType: string;
    grossAmount: number;
    platformFee: number;
    netAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    paidAt: string;
}): Promise<Buffer>;
/**
 * Generate official GRA Tax Statement PDF for Landlords
 */
export declare function generateGRATaxReportPDF(data: {
    landlordName: string;
    landlordEmail: string;
    landlordPhone: string;
    taxYear: number;
    grossRevenue: number;
    totalMaintenanceDeductions: number;
    withholdingTax5Percent: number;
    netTaxableIncome: number;
    transactionCount: number;
    propertyBreakdown: {
        title: string;
        gross: number;
        maintenance: number;
        net: number;
    }[];
}): Promise<Buffer>;
//# sourceMappingURL=pdf.service.d.ts.map