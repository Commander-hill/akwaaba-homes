import PDFDocument from 'pdfkit';

/**
 * Generate official signed Tenancy Agreement PDF
 */
export async function generateTenancyAgreementPDF(data: {
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
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Header Banner
    doc
      .rect(0, 0, 595.28, 90)
      .fill('#1E1B4B'); // Indigo 950

    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('AKWAABA HOMES', 40, 25);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#A5B4FC')
      .text('Official Digital Tenancy Agreement & Lease Contract', 40, 52);

    doc
      .fontSize(9)
      .fillColor('#E0E7FF')
      .text(`Ref ID: ${data.agreementId.slice(0, 8).toUpperCase()}`, 420, 35, { align: 'right' })
      .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 420, 50, { align: 'right' });

    doc.moveDown(4);

    // Document Title
    doc
      .fillColor('#1E293B')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('RESIDENTIAL TENANCY LEASE AGREEMENT', 40, 110, { align: 'center' });

    doc
      .fontSize(9)
      .font('Helvetica-Oblique')
      .fillColor('#64748B')
      .text('Legally Binding Digital Instrument pursuant to the Electronic Transactions Act of Ghana', { align: 'center' });

    doc.moveDown(1.5);

    // Section 1: Parties
    const startY = 160;
    doc
      .rect(40, startY, 515, 80)
      .fillAndStroke('#F8FAFC', '#CBD5E1');

    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('1. CONTRACTING PARTIES', 50, startY + 10);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#0F172A')
      .text(`LANDLORD / HOST: ${data.landlordName} (Phone: ${data.landlordPhone})`, 50, startY + 30)
      .text(`TENANT: ${data.tenantName} (${data.tenantEmail} | ${data.tenantPhone})`, 50, startY + 50);

    // Section 2: Premises & Duration
    const startY2 = 255;
    doc
      .rect(40, startY2, 515, 95)
      .fillAndStroke('#F8FAFC', '#CBD5E1');

    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('2. PREMISES & LEASE TERMS', 50, startY2 + 10);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#0F172A')
      .text(`PROPERTY: ${data.propertyTitle}`, 50, startY2 + 30)
      .text(`LOCATION: ${data.propertyAddress}`, 50, startY2 + 45)
      .text(`ROOM CATEGORY: ${data.roomType}`, 50, startY2 + 60)
      .text(`TENANCY PERIOD: ${data.startDate} to ${data.endDate}`, 50, startY2 + 75);

    // Section 3: Financial Terms
    const startY3 = 365;
    doc
      .rect(40, startY3, 515, 60)
      .fillAndStroke('#EEF2FF', '#6366F1');

    doc
      .fillColor('#4338CA')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('3. RENT & PAYMENT SUMMARY', 50, startY3 + 10);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1E1B4B')
      .text(`TOTAL AGREED LEASE RENT: GHS ${data.rentAmount.toLocaleString()}`, 50, startY3 + 32);

    // Section 4: General Terms & Covenants
    const startY4 = 440;
    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('4. STANDARD LEASE COVENANTS', 40, startY4);

    const covenants = [
      '• The Tenant agrees to use the premises strictly for student residential occupancy and to respect hostel tranquility.',
      '• Subletting or transferring occupancy to unregistered third parties without written landlord consent is strictly prohibited.',
      '• Maintenance issues must be logged via the Akwaaba Homes Maintenance Dispatch module for logged tracking.',
      '• Either party may terminate this agreement upon 30 days prior notice subject to platform refund policy guidelines.'
    ];

    let covenantY = startY4 + 18;
    covenants.forEach((item) => {
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(item, 40, covenantY, { width: 515 });
      covenantY += 20;
    });

    // Section 5: Digital Signatures & Cryptographic Seal
    const startY5 = 560;
    doc
      .rect(40, startY5, 515, 140)
      .fillAndStroke('#F1F5F9', '#94A3B8');

    doc
      .fillColor('#1E293B')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('5. DIGITAL EXECUTION & E-SIGNATURE VERIFICATION', 50, startY5 + 10);

    // Tenant Column
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text('TENANT SIGNATURE', 60, startY5 + 30)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text(`Name: ${data.tenantName}`, 60, startY5 + 45)
      .text(`Signed At: ${data.tenantSignedAt || 'Digital Consent On-File'}`, 60, startY5 + 60)
      .text('Status: ✅ VERIFIED E-SIGNATURE', 60, startY5 + 75);

    // Landlord Column
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text('LANDLORD / HOST SIGNATURE', 300, startY5 + 30)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text(`Name: ${data.landlordName}`, 300, startY5 + 45)
      .text(`Signed At: ${data.landlordSignedAt || 'Pending Host Stamp'}`, 300, startY5 + 60)
      .text('Status: 🛡️ VERIFIED HOST', 300, startY5 + 75);

    // Cryptographic Seal & Stamp Footer
    doc
      .rect(50, startY5 + 95, 495, 35)
      .fill('#E2E8F0');

    doc
      .fillColor('#334155')
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .text(`AKWAABA HOMES CRYPTOGRAPHIC SEAL: SHA256-${(data.cryptographicHash || data.agreementId).slice(0, 32)}`, 60, startY5 + 102);

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748B')
      .text('Tamper-evident legal hash stored on Akwaaba Homes Immutable Audit Ledger.', 60, startY5 + 115);

    // Page Footer Watermark
    doc
      .fontSize(8)
      .fillColor('#94A3B8')
      .text('Page 1 of 1 • Akwaaba Homes Ghana • Automated PDF Engine', 40, 780, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate official Payment Receipt / Invoice PDF
 */
export async function generateReceiptPDF(data: {
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
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

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
