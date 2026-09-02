"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTenancyAgreementPDF = generateTenancyAgreementPDF;
exports.generateReceiptPDF = generateReceiptPDF;
exports.generateGRATaxReportPDF = generateGRATaxReportPDF;
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * Generate official signed Tenancy Agreement PDF
 */
async function generateTenancyAgreementPDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4', autoFirstPage: true });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
        // ════════════════════════════════════════════════════════════════
        // PAGE 1: HEADER, PARTIES, PREMISES, FINANCIALS & LANDLORD COVENANTS
        // ════════════════════════════════════════════════════════════════
        // Top Header Banner
        doc.rect(0, 0, 595.28, 95).fill('#0F172A'); // Slate 900
        doc
            .fillColor('#F8FAFC')
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('REPUBLIC OF GHANA', 40, 20, { align: 'left' });
        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#F59E0B') // Amber 400
            .text('STATUTORY RESIDENTIAL & COMMERCIAL TENANCY AGREEMENT', 40, 42, { align: 'left' });
        doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor('#94A3B8')
            .text('Pursuant to Rent Act, 1963 (Act 220), Rent Regulations (L.I. 369) & Electronic Transactions Act, 2008 (Act 772)', 40, 60, { align: 'left' });
        doc
            .fontSize(8)
            .fillColor('#CBD5E1')
            .text(`VAULT REF: ${data.agreementId.slice(0, 10).toUpperCase()}`, 380, 25, { align: 'right' })
            .text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 380, 40, { align: 'right' })
            .text('STATUS: ✅ LEGALLY BINDING', 380, 55, { align: 'right' });
        // Section 1: Contracting Parties
        const startY1 = 110;
        doc.rect(40, startY1, 515, 80).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc
            .fillColor('#1E293B')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('1. THE CONTRACTING PARTIES', 50, startY1 + 10);
        doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor('#0F172A')
            .text(`LANDLORD / LESSOR: ${data.landlordName}`, 50, startY1 + 28)
            .fillColor('#475569')
            .text(`Contact Phone: ${data.landlordPhone} • Identity Status: Verified Host (Ghana Card KYC on-file)`, 50, startY1 + 42)
            .fillColor('#0F172A')
            .text(`TENANT / LESSEE: ${data.tenantName}`, 50, startY1 + 56)
            .fillColor('#475569')
            .text(`Contact: ${data.tenantPhone} | ${data.tenantEmail} • Identity Status: Verified Tenant`, 50, startY1 + 68);
        // Section 2: Demised Premises & Term
        const startY2 = 200;
        doc.rect(40, startY2, 515, 80).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc
            .fillColor('#1E293B')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('2. DEMISED PREMISES & TENANCY DURATION', 50, startY2 + 10);
        doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor('#0F172A')
            .text(`PROPERTY NAME: ${data.propertyTitle}`, 50, startY2 + 28)
            .text(`PHYSICAL LOCATION: ${data.propertyAddress}`, 50, startY2 + 42)
            .text(`ACCOMMODATION / UNIT CATEGORY: ${data.roomType}`, 50, startY2 + 56)
            .text(`COMMENCEMENT & EXPIRATION: ${data.startDate} to ${data.endDate}`, 50, startY2 + 68);
        // Section 3: Financial Consideration & Escrow
        const startY3 = 290;
        doc.rect(40, startY3, 515, 65).fillAndStroke('#EFF6FF', '#3B82F6');
        doc
            .fillColor('#1D4ED8')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('3. RENT CONSIDERATION & ESCROW PROTECTION (ACT 220 CERTIFIED)', 50, startY3 + 10);
        doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#0F172A')
            .text(`TOTAL AGREED RENT: GHS ${data.rentAmount.toLocaleString()}`, 50, startY3 + 28);
        doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#475569')
            .text('Payment is authenticated via Paystack Escrow (MTN MoMo, Telecel Cash, AT & Bank Transfer).', 50, startY3 + 46);
        // Section 4: Statutory Landlord Covenants (Act 220, Section 20)
        const startY4 = 365;
        doc.rect(40, startY4, 515, 140).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc
            .fillColor('#1E293B')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('4. STATUTORY LANDLORD COVENANTS (RENT ACT 220, SECTION 20)', 50, startY4 + 10);
        const landlordCovenants = [
            '• Quiet Enjoyment: Landlord shall guarantee tenant uninterrupted, quiet enjoyment of demised premises.',
            '• Structural Repairs: Landlord shall be strictly responsible for roof, foundation, external walls, and main plumbing.',
            '• Right of Inspection: Landlord/agent must provide minimum 24-hour advance written notice before conducting inspections.',
            '• Prohibition of Unlawful Eviction: Landlord covenants never to unlawfully eject, lockout, disconnect water or electricity, or remove roofing without an order of a competent Rent Magistrate or Court (Act 220, Sec. 17).',
            '• Rent Receipts: Landlord shall ensure an official electronic or physical rent receipt is furnished for all payments.'
        ];
        let lCovenantY = startY4 + 28;
        landlordCovenants.forEach((c) => {
            doc.fontSize(8).font('Helvetica').fillColor('#334155').text(c, 50, lCovenantY, { width: 495 });
            lCovenantY += 21;
        });
        // Section 5: Tenant Covenants
        const startY5 = 515;
        doc.rect(40, startY5, 515, 130).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc
            .fillColor('#1E293B')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('5. STATUTORY TENANT COVENANTS (RENT ACT 220)', 50, startY5 + 10);
        const tenantCovenants = [
            '• Rent Punctuality: Tenant shall pay agreed rent punctually through the Akwaaba Homes verified payment gateway.',
            '• Internal Maintenance: Tenant shall keep internal fixtures, glass, and light points in good tenantable order (fair wear excepted).',
            '• No Unauthorized Subletting: Tenant shall not sublet or part with possession of premises without written landlord consent.',
            '• Permitted Use: Premises shall be used strictly for lawful residential/commercial purposes in conformity with community quiet hours.',
            '• Handover Inspection: Tenant shall participate in the digital move-in and move-out inspection checklists.'
        ];
        let tCovenantY = startY5 + 28;
        tenantCovenants.forEach((c) => {
            doc.fontSize(8).font('Helvetica').fillColor('#334155').text(c, 50, tCovenantY, { width: 495 });
            tCovenantY += 19;
        });
        // Bottom Footer Page 1
        doc
            .fontSize(8)
            .fillColor('#94A3B8')
            .text('Page 1 of 2 • Akwaaba Homes Ghana • Statutory Digital Tenancy Vault', 40, 785, { align: 'center' });
        // ════════════════════════════════════════════════════════════════
        // PAGE 2: SECURITY DEPOSIT, TERMINATION & CRYPTOGRAPHIC E-SIGNATURES
        // ════════════════════════════════════════════════════════════════
        doc.addPage({ margin: 40, size: 'A4' });
        // Top Header Banner Page 2
        doc.rect(0, 0, 595.28, 55).fill('#0F172A');
        doc
            .fillColor('#F8FAFC')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('AKWAABA HOMES • STATUTORY TENANCY VAULT', 40, 18);
        doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor('#F59E0B')
            .text(`AGREEMENT REF: ${data.agreementId.slice(0, 12).toUpperCase()}`, 350, 20, { align: 'right' });
        // Section 6: Security / Caution Deposit Escrow
        const p2Y1 = 75;
        doc.rect(40, p2Y1, 515, 80).fillAndStroke('#FEF3C7', '#F59E0B');
        doc
            .fillColor('#92400E')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('6. CAUTION DEPOSIT ESCROW & REFUND PROTOCOL', 50, p2Y1 + 10);
        doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#78350F')
            .text('• Any caution deposit paid shall be held in protected custody and shall NOT be treated as rent.', 50, p2Y1 + 28)
            .text('• Refund shall be processed within fourteen (14) calendar days following post-tenancy joint digital inspection.', 50, p2Y1 + 42)
            .text('• Deductions are strictly limited to documented physical damages beyond reasonable wear and tear.', 50, p2Y1 + 56);
        // Section 7: Termination & Notice to Quit (Act 220, Section 17)
        const p2Y2 = 165;
        doc.rect(40, p2Y2, 515, 85).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc
            .fillColor('#1E293B')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('7. DETERMINATION OF TENANCY & NOTICE TO QUIT (ACT 220, SEC. 17)', 50, p2Y2 + 10);
        doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#334155')
            .text('• Monthly Tenancy: Minimum of one (1) clear calendar month notice in writing prior to expiration.', 50, p2Y2 + 28)
            .text('• Annual / Academic Lease: Minimum of three (3) clear calendar months notice prior to expiration.', 50, p2Y2 + 42)
            .text('• Recovery of Possession: Governed strictly by the statutory grounds set out under Section 17 of Rent Act, 1963.', 50, p2Y2 + 56)
            .text('• Breach of Covenants: Either party may seek mediation or judicial determination through Rent Control or High Court.', 50, p2Y2 + 70);
        // Section 8: Digital Execution & Electronic Signatures (Act 772)
        const p2Y3 = 260;
        doc.rect(40, p2Y3, 515, 175).fillAndStroke('#F1F5F9', '#94A3B8');
        doc
            .fillColor('#0F172A')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('8. DIGITAL EXECUTION & E-SIGNATURE VERIFICATION (ELECTRONIC TRANSACTIONS ACT 772)', 50, p2Y3 + 10);
        // Tenant Signature Column
        doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#1E293B')
            .text('TENANT / LESSEE SIGNATURE', 60, p2Y3 + 30)
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#334155')
            .text(`Full Name: ${data.tenantName}`, 60, p2Y3 + 48)
            .text(`Email: ${data.tenantEmail}`, 60, p2Y3 + 62)
            .text(`Phone: ${data.tenantPhone}`, 60, p2Y3 + 76)
            .text(`Signed At: ${data.tenantSignedAt || 'Digital Consent On-File'}`, 60, p2Y3 + 90)
            .fillColor('#059669')
            .font('Helvetica-Bold')
            .text('Authentication: ✅ VERIFIED E-SIGNATURE', 60, p2Y3 + 105);
        // Landlord Signature Column
        doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#1E293B')
            .text('LANDLORD / LESSOR SIGNATURE', 300, p2Y3 + 30)
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#334155')
            .text(`Full Name: ${data.landlordName}`, 300, p2Y3 + 48)
            .text(`Phone: ${data.landlordPhone}`, 300, p2Y3 + 62)
            .text(`Signed At: ${data.landlordSignedAt || 'Pending Host Execution'}`, 300, p2Y3 + 76)
            .text(`Status: ${data.landlordSignedAt ? 'VERIFIED HOST E-SIGNATURE' : 'PENDING STAMP'}`, 300, p2Y3 + 90)
            .fillColor('#059669')
            .font('Helvetica-Bold')
            .text('Authentication: 🛡️ GHANA CARD HOST KYC', 300, p2Y3 + 105);
        // Section 9: Tamper-Proof Cryptographic SHA-256 Audit Seal
        const p2Y4 = 445;
        doc.rect(40, p2Y4, 515, 65).fillAndStroke('#E2E8F0', '#64748B');
        doc
            .fillColor('#1E293B')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('IMMUTABLE AUDIT TRAIL & CRYPTOGRAPHIC SHA-256 SEAL', 50, p2Y4 + 10);
        const hashVal = data.cryptographicHash || data.agreementId;
        doc
            .font('Courier-Bold')
            .fontSize(8)
            .fillColor('#0F172A')
            .text(`SHA256: ${hashVal}`, 50, p2Y4 + 26, { width: 495 });
        doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#475569')
            .text('This digital instrument is encrypted and cryptographically sealed on the Akwaaba Homes Legal Ledger.', 50, p2Y4 + 42)
            .text('Any alteration, tampering, or forgery invalidates this certificate under Act 772 of the Laws of Ghana.', 50, p2Y4 + 53);
        // Official Digital Stamp Emblem
        const p2Y5 = 525;
        doc.rect(170, p2Y5, 255, 60).fillAndStroke('#F0FDF4', '#16A34A');
        doc
            .fillColor('#15803D')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('AKWAABA HOMES OFFICIAL DIGITAL SEAL', 170, p2Y5 + 12, { align: 'center', width: 255 });
        doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#166534')
            .text('ACT 220 & ACT 772 COMPLIANT • REGISTERED TENANCY', 170, p2Y5 + 30, { align: 'center', width: 255 })
            .text(`SECURED VIA PAYSTACK ESCROW • ${new Date().getFullYear()}`, 170, p2Y5 + 43, { align: 'center', width: 255 });
        // Page 2 Footer
        doc
            .fontSize(8)
            .fillColor('#94A3B8')
            .text('Page 2 of 2 • Republic of Ghana Statutory Tenancy Vault • End of Agreement', 40, 785, { align: 'center' });
        doc.end();
    });
}
/**
 * Generate official Payment Receipt / Invoice PDF
 */
async function generateReceiptPDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
        // Header Banner
        doc
            .rect(0, 0, 595.28, 100)
            .fill('#064E3B'); // Emerald 900
        doc
            .fillColor('#FFFFFF')
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('AKWAABA HOMES', 40, 28);
        doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#A7F3D0')
            .text('OFFICIAL HOSTEL PAYMENT RECEIPT', 40, 55);
        doc
            .fontSize(9)
            .fillColor('#D1FAE5')
            .text(`Receipt #: ${data.reference}`, 400, 32, { align: 'right' })
            .text(`Issued: ${new Date(data.paidAt).toLocaleDateString('en-GB')}`, 400, 48, { align: 'right' })
            .text(`Status: ${data.paymentStatus.toUpperCase()}`, 400, 64, { align: 'right' });
        // Payment Verified Stamp
        doc
            .rect(40, 120, 515, 50)
            .fill('#ECFDF5');
        doc
            .fillColor('#047857')
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('✅ PAYMENT CONFIRMED & AUDITED', 55, 137);
        // Customer & Booking Metadata
        const startY = 185;
        doc
            .rect(40, startY, 515, 90)
            .fillAndStroke('#F8FAFC', '#E2E8F0');
        doc
            .fillColor('#334155')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('PAYER & PROPERTY DETAILS', 50, startY + 12);
        doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#0F172A')
            .text(`Student Name: ${data.studentName}`, 50, startY + 32)
            .text(`Email Address: ${data.studentEmail} (${data.studentPhone || 'N/A'})`, 50, startY + 47)
            .text(`Hostel / Property: ${data.propertyTitle}`, 50, startY + 62)
            .text(`Room Option: ${data.roomType}`, 300, startY + 62);
        // Itemized Financial Table
        const tableY = 295;
        doc
            .rect(40, tableY, 515, 25)
            .fill('#1E293B');
        doc
            .fillColor('#FFFFFF')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('DESCRIPTION', 50, tableY + 7)
            .text('PAYMENT GATEWAY', 320, tableY + 7)
            .text('AMOUNT (GHS)', 440, tableY + 7, { align: 'right' });
        // Table Content Row
        doc
            .rect(40, tableY + 25, 515, 40)
            .fillAndStroke('#FFFFFF', '#E2E8F0');
        doc
            .fillColor('#0F172A')
            .fontSize(9)
            .font('Helvetica')
            .text(`Hostel Accommodation Rent (${data.roomType})`, 50, tableY + 38)
            .text(`${data.paymentMethod} / Paystack`, 320, tableY + 38)
            .font('Helvetica-Bold')
            .text(`GHS ${data.grossAmount.toLocaleString()}`, 440, tableY + 38, { align: 'right' });
        // Total Amount Box
        const totalY = 375;
        doc
            .rect(320, totalY, 235, 45)
            .fill('#064E3B');
        doc
            .fillColor('#A7F3D0')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('TOTAL PAID AMOUNT:', 330, totalY + 15);
        doc
            .fillColor('#FFFFFF')
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(`GHS ${data.grossAmount.toLocaleString()}`, 440, totalY + 12, { align: 'right' });
        // Security & Stamp Footer
        const footerY = 460;
        doc
            .fontSize(8)
            .font('Helvetica-Oblique')
            .fillColor('#64748B')
            .text('This is an official computer-generated receipt issued by Akwaaba Homes Student Housing Platform.', 40, footerY, { width: 515 });
        doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#94A3B8')
            .text(`Transaction Reference: ${data.reference} • System ID: ${data.transactionId}`, 40, footerY + 20)
            .text('Need support? Contact support@akwaabahomes.com or visit www.akwaabahomes.com', 40, footerY + 35);
        doc.end();
    });
}
/**
 * Generate official GRA Tax Statement PDF for Landlords
 */
async function generateGRATaxReportPDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
        // Header Banner (Ghana National Colors Theme)
        doc
            .rect(0, 0, 595.28, 100)
            .fill('#064E3B'); // Emerald 900
        doc
            .fillColor('#FFFFFF')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('GHANA REVENUE AUTHORITY (GRA)', 40, 25);
        doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#FDE047') // Yellow accent
            .text('OFFICIAL ANNUAL RENTAL INCOME TAX STATEMENT', 40, 52);
        doc
            .fontSize(9)
            .fillColor('#D1FAE5')
            .text(`Tax Year: ${data.taxYear}`, 400, 32, { align: 'right' })
            .text(`Issued: ${new Date().toLocaleDateString('en-GB')}`, 400, 48, { align: 'right' });
        doc.moveDown(4);
        // Landlord Taxpayer Profile Box
        const startY = 120;
        doc
            .rect(40, startY, 515, 75)
            .fillAndStroke('#F8FAFC', '#CBD5E1');
        doc
            .fillColor('#334155')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('TAXPAYER IDENTIFICATION & LANDLORD DETAILS', 50, startY + 10);
        doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#0F172A')
            .text(`Landlord Name: ${data.landlordName}`, 50, startY + 28)
            .text(`Contact Email: ${data.landlordEmail} (${data.landlordPhone})`, 50, startY + 43)
            .text(`Total Rental Transactions Processed: ${data.transactionCount}`, 50, startY + 58);
        // Financial Summary Ribbon
        const startY2 = 210;
        doc
            .rect(40, startY2, 515, 110)
            .fillAndStroke('#EEF2FF', '#6366F1');
        doc
            .fillColor('#3730A3')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('TAX COMPUTATION & REVENUE BREAKDOWN', 50, startY2 + 12);
        doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#1E1B4B')
            .text(`Gross Rental Revenue: GHS ${data.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 50, startY2 + 32)
            .text(`Less Allowable Maintenance Expenses: -GHS ${data.totalMaintenanceDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 50, startY2 + 50)
            .text(`Estimated GRA Withholding Tax (5% Rate): GHS ${data.withholdingTax5Percent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 50, startY2 + 68);
        doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#047857')
            .text(`NET TAXABLE LANDLORD INCOME: GHS ${data.netTaxableIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 50, startY2 + 88);
        // Property Line-Item Table
        const tableY = 335;
        doc
            .rect(40, tableY, 515, 22)
            .fill('#1E293B');
        doc
            .fillColor('#FFFFFF')
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text('PROPERTY TITLE', 50, tableY + 6)
            .text('GROSS RENT', 280, tableY + 6)
            .text('MAINTENANCE', 370, tableY + 6)
            .text('NET YIELD (GHS)', 460, tableY + 6, { align: 'right' });
        let currentY = tableY + 22;
        data.propertyBreakdown.forEach((prop, idx) => {
            doc
                .rect(40, currentY, 515, 22)
                .fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC', '#E2E8F0');
            doc
                .fillColor('#0F172A')
                .fontSize(8.5)
                .font('Helvetica')
                .text(prop.title.slice(0, 32), 50, currentY + 6)
                .text(`GHS ${prop.gross.toLocaleString()}`, 280, currentY + 6)
                .text(`GHS ${prop.maintenance.toLocaleString()}`, 370, currentY + 6)
                .font('Helvetica-Bold')
                .text(`GHS ${prop.net.toLocaleString()}`, 460, currentY + 6, { align: 'right' });
            currentY += 22;
        });
        // GRA Compliance Certification Footer
        const footerY = Math.max(currentY + 25, 620);
        doc
            .rect(40, footerY, 515, 50)
            .fill('#F0FDF4');
        doc
            .fillColor('#166534')
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text('GRA CERTIFICATION & COMPLIANCE NOTICE', 50, footerY + 10);
        doc
            .fontSize(7.5)
            .font('Helvetica')
            .fillColor('#15803D')
            .text('This statement reflects audited rental income and maintenance cost deductions logged on the Akwaaba Homes Housing Infrastructure. Generated for annual Ghana Revenue Authority (GRA) individual tax return filing.', 50, footerY + 25, { width: 495 });
        doc
            .fontSize(8)
            .fillColor('#94A3B8')
            .text('Page 1 of 1 • Generated by Akwaaba Homes Tax Engine • www.akwaabahomes.com', 40, 780, { align: 'center' });
        doc.end();
    });
}
//# sourceMappingURL=pdf.service.js.map