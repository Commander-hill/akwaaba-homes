/**
 * Generate official signed Tenancy Agreement PDF (Human-Crafted Ghanaian Conveyancing Standard)
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
    isStudentHostel?: boolean;
    studentCampus?: string | null;
    studentId?: string | null;
    programmeOfStudy?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
}): Promise<Buffer>;
/**
 * Generate official Payment Receipt / Invoice PDF
 * Exact Ghana Transaction Receipt Standard with Akwaaba Homes Watermark & Scannable QR
 */
export declare function generateReceiptPDF(data: {
    transactionId: string;
    bookingId?: string;
    reference: string;
    studentName: string;
    studentEmail: string;
    studentPhone?: string | null;
    studentId?: string | null;
    studentCampus?: string | null;
    landlordName?: string | null;
    landlordPhone?: string | null;
    landlordEmail?: string | null;
    propertyTitle: string;
    propertyLocation?: string | null;
    roomType: string;
    unitAllocation?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    pricePeriod?: string | null;
    baseRentAmount?: number;
    cautionDepositAmount?: number;
    grossAmount: number;
    platformFee: number;
    netAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    checkInCode?: string | null;
    paidAt: string;
}): Promise<Buffer>;
/**
 * Generate official GRA Tax Statement PDF for Landlords
 * Crafted in classical Ghanaian Statutory Tax Return Schedule format (Income Tax Act, 2015 Act 896)
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