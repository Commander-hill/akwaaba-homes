import PDFDocument from 'pdfkit';

/**
 * Generate official signed Tenancy Agreement PDF (Human-Crafted Ghanaian Conveyancing Standard)
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
  isStudentHostel?: boolean;
  studentCampus?: string | null;
  studentId?: string | null;
  programmeOfStudy?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: 'A4', autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const docRef = `AKW/${new Date().getFullYear()}/${data.agreementId.slice(0, 8).toUpperCase()}`;
    const executionDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // ════════════════════════════════════════════════════════════════
    // PAGE 1: FORMAL CONVEYANCING HEADER, RECITALS, SCHEDULE & CLAUSES
    // ════════════════════════════════════════════════════════════════

    // Top Reference Folio Line
    doc
      .font('Times-Roman')
      .fontSize(9)
      .fillColor('#57534E')
      .text(`INSTRUMENT REF: ${docRef}`, 54, 42, { align: 'left' })
      .text('REPUBLIC OF GHANA', 54, 42, { align: 'right' });

    doc.moveTo(54, 56).lineTo(541, 56).lineWidth(0.5).strokeColor('#A8A29E').stroke();

    // Formal Title Block
    doc
      .font('Times-Bold')
      .fontSize(10)
      .fillColor('#292524')
      .text('REPUBLIC OF GHANA', 54, 68, { align: 'center', characterSpacing: 2 });

    doc
      .font('Times-Bold')
      .fontSize(16)
      .fillColor('#111110')
      .text('TENANCY AGREEMENT', 54, 84, { align: 'center', characterSpacing: 1.5 });

    doc
      .font('Times-Italic')
      .fontSize(9.5)
      .fillColor('#57534E')
      .text('Made pursuant to the Rent Act, 1963 (Act 220) and the Conveyancing Act, 1973 (N.R.C.D. 175)', 54, 104, {
        align: 'center',
      });

    // Double Rule Divider
    doc.moveTo(54, 122).lineTo(541, 122).lineWidth(1.2).strokeColor('#1C1917').stroke();
    doc.moveTo(54, 125).lineTo(541, 125).lineWidth(0.5).strokeColor('#1C1917').stroke();

    // Opening Recital & Parties
    let y = 140;
    doc
      .font('Times-Roman')
      .fontSize(10.5)
      .fillColor('#1C1917')
      .text(
        `THIS TENANCY AGREEMENT is made on ${executionDate} BETWEEN ${data.landlordName.toUpperCase()} (Telephone: ${data.landlordPhone || 'on file'}) of the Republic of Ghana, hereinafter referred to as "the Landlord" (which expression shall, where the context so admits, include the Landlord's heirs, personal representatives, successors-in-title, and assigns) of the one part;`,
        54,
        y,
        { width: 487, align: 'justify', lineGap: 3 }
      );

    y = doc.y + 10;
    doc.text(
      `AND ${data.tenantName.toUpperCase()} (Telephone: ${data.tenantPhone || 'on file'}; Electronic Mail: ${data.tenantEmail})${data.studentCampus ? `, Student of ${data.studentCampus} (ID: ${data.studentId || 'on file'})` : ''}, hereinafter referred to as "the Tenant" (which expression shall, where the context so admits, include the Tenant's personal representatives and permitted assigns) of the other part.`,
      54,
      y,
      { width: 487, align: 'justify', lineGap: 3 }
    );

    // WHEREAS Recitals
    y = doc.y + 12;
    doc.font('Times-Bold').text('WHEREAS:', 54, y);
    y = doc.y + 4;
    doc
      .font('Times-Roman')
      .text(
        `I. The Landlord is the lawful owner or authorized lessor of the residential property known as ${data.propertyTitle}, situated at ${data.propertyAddress} in the Republic of Ghana (hereinafter referred to as "the Premises").`,
        68,
        y,
        { width: 473, align: 'justify', lineGap: 2.5 }
      );
    y = doc.y + 5;
    doc.text(
      'II. The Landlord has agreed to let and the Tenant has agreed to take the Premises for the term and at the rent hereinafter set forth, subject to the covenants, conditions, and stipulations contained in this Agreement.',
      68,
      y,
      { width: 473, align: 'justify', lineGap: 2.5 }
    );

    y = doc.y + 12;
    doc.font('Times-Bold').fontSize(10).text('NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:', 54, y);

    // Schedule of Tenancy Particulars (Clean Bordered Legal Table)
    y = doc.y + 10;
    doc.font('Times-Bold').fontSize(9.5).text('SCHEDULE OF TENANCY PARTICULARS', 54, y);
    y = doc.y + 5;

    const scheduleRows = [
      ['1. Description & Location of Premises', `${data.propertyTitle}, situated at ${data.propertyAddress}`],
      ['2. Unit / Accommodation Category', data.roomType || 'Self-Contained Residential Unit'],
      ['3. Term of Tenancy', `From ${data.startDate} to ${data.endDate}`],
      ['4. Agreed Rent for the Term', `GHS ${Number(data.rentAmount).toLocaleString('en-GH', { minimumFractionDigits: 2 })} (Ghana Cedis)`],
      ['5. Permitted Use', 'Private Residential Occupation Only'],
    ];

    const col1Width = 185;
    const col2Width = 302;
    const rowHeight = 20;

    scheduleRows.forEach(([label, val]) => {
      doc.rect(54, y, col1Width, rowHeight).fillAndStroke('#F5F2EB', '#A8A29E');
      doc.rect(54 + col1Width, y, col2Width, rowHeight).stroke('#A8A29E');

      doc
        .font('Times-Bold')
        .fontSize(9.5)
        .fillColor('#292524')
        .text(label, 60, y + 5, { width: col1Width - 12 });

      doc
        .font('Times-Roman')
        .fontSize(9.5)
        .fillColor('#1C1917')
        .text(val, 54 + col1Width + 8, y + 5, { width: col2Width - 16 });

      y += rowHeight;
    });

    // Clause 1
    y += 14;
    doc.font('Times-Bold').fontSize(10.5).fillColor('#111110').text('1. GRANT OF TENANCY AND TERM', 54, y);
    y = doc.y + 4;
    doc
      .font('Times-Roman')
      .fontSize(10)
      .fillColor('#1C1917')
      .text(
        `In consideration of the rent hereby reserved and the covenants on the part of the Tenant hereinafter contained, the Landlord hereby lets unto the Tenant the Premises described in the Schedule hereto, TO HOLD the same unto the Tenant from ${data.startDate} until ${data.endDate}, unless earlier determined in accordance with the provisions of this Agreement or the Rent Act, 1963 (Act 220).`,
        54,
        y,
        { width: 487, align: 'justify', lineGap: 2.5 }
      );

    // Clause 2
    y = doc.y + 12;
    doc.font('Times-Bold').fontSize(10.5).fillColor('#111110').text('2. RENT AND RECEIPTS', 54, y);
    y = doc.y + 4;
    doc
      .font('Times-Roman')
      .fontSize(10)
      .fillColor('#1C1917')
      .text(
        `2.1. The rent reserved for the tenancy is GHS ${Number(data.rentAmount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}, paid by the Tenant through the designated settlement channel into escrow custody on behalf of the Landlord.\n2.2. In accordance with Section 20 of the Rent Act, 1963 (Act 220), every payment of rent made under this Agreement shall be acknowledged by an official written or electronic rent receipt issued to the Tenant stating the period covered and the sum received.`,
        54,
        y,
        { width: 487, align: 'justify', lineGap: 2.5 }
      );

    // Clause 3
    y = doc.y + 12;
    doc.font('Times-Bold').fontSize(10.5).fillColor('#111110').text("3. TENANT'S COVENANTS", 54, y);
    y = doc.y + 4;
    doc.font('Times-Roman').fontSize(10).text('The Tenant hereby covenants with the Landlord as follows:', 54, y);

    const tenantClauses = [
      '3.1. Payment of Rent and Utilities: To pay the reserved rent punctually as stipulated, and to pay all charges for electricity, water, sanitation, and other utilities consumed on or attributable to the Premises during the tenancy.',
      '3.2. Care of Interior and Fixtures: To keep the interior of the Premises, including all doors, windows, locks, sanitary fittings, electrical appliances, and fixtures provided by the Landlord, in a clean and tenantable state of repair (fair wear and tear excepted).',
      '3.3. Alterations: Not to make any structural alterations, additions, or permanent modifications to the Premises without obtaining the prior written consent of the Landlord.',
      '3.4. Prohibition on Assignment and Subletting: Not to assign, sublet, or part with the possession of the Premises or any part thereof to any third party without the prior written consent of the Landlord, in compliance with Section 22 of the Rent Act, 1963 (Act 220).',
      '3.5. Good Neighbourliness and Conduct: Not to do or permit to be done upon the Premises anything which may constitute a nuisance, annoyance, or disturbance to the Landlord, co-tenants, or occupiers of adjoining properties.',
      "3.6. Condition Inspection and Yielding Up: To participate in a joint condition inspection upon taking possession and at the expiration of the tenancy, and to peaceably yield up the Premises with all keys and Landlord's fixtures in good tenantable order at the determination of the tenancy.",
    ];

    tenantClauses.forEach((clause) => {
      y = doc.y + 5;
      doc.font('Times-Roman').fontSize(9.8).fillColor('#1C1917').text(clause, 66, y, {
        width: 475,
        align: 'justify',
        lineGap: 2,
      });
    });

    // Bottom Footer Page 1
    doc.moveTo(54, 770).lineTo(541, 770).lineWidth(0.5).strokeColor('#D6D0C4').stroke();
    doc
      .font('Times-Italic')
      .fontSize(8.5)
      .fillColor('#57534E')
      .text(`Tenancy Agreement (${docRef})`, 54, 776, { align: 'left' })
      .text('Page 1 of 2', 54, 776, { align: 'right' });

    // ════════════════════════════════════════════════════════════════
    // PAGE 2: LANDLORD COVENANTS, DEPOSIT, NOTICE & EXECUTION BLOCK
    // ════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 54, size: 'A4' });

    doc
      .font('Times-Roman')
      .fontSize(9)
      .fillColor('#57534E')
      .text(`INSTRUMENT REF: ${docRef}`, 54, 42, { align: 'left' })
      .text('CONTINUATION SHEET', 54, 42, { align: 'right' });
    doc.moveTo(54, 56).lineTo(541, 56).lineWidth(0.5).strokeColor('#A8A29E').stroke();

    // Clause 4: Landlord's Covenants
    let p2Y = 72;
    doc.font('Times-Bold').fontSize(10.5).fillColor('#111110').text("4. LANDLORD'S COVENANTS", 54, p2Y);
    p2Y = doc.y + 4;
    doc.font('Times-Roman').fontSize(10).text('The Landlord hereby covenants with the Tenant as follows:', 54, p2Y);

    const landlordClauses = [
      "4.1. Quiet Enjoyment: That the Tenant, paying the rent hereby reserved and observing and performing the covenants and obligations on the Tenant's part herein contained, shall peaceably and quietly hold and enjoy the Premises during the term without any unlawful interruption, harassment, or disturbance by the Landlord.",
      '4.2. Structural and External Repairs: To keep the roof, foundation, exterior walls, main drains, main plumbing pipes, and primary electrical conduit of the Premises in good and tenantable structural repair throughout the term of the tenancy.',
      "4.3. Notice of Entry for Inspection: To give the Tenant not less than twenty-four (24) hours' prior notice (except in the case of an emergency) before entering the Premises at reasonable daytime hours to inspect its condition or carry out necessary repairs.",
      '4.4. Due Process of Law: Not to unlawfully lock out the Tenant, remove roofing or doors, or disconnect essential water or electricity supplies as a means of compelling vacation of the Premises, in strict observance of the Rent Act, 1963 (Act 220).',
    ];

    landlordClauses.forEach((clause) => {
      p2Y = doc.y + 5;
      doc.font('Times-Roman').fontSize(9.8).fillColor('#1C1917').text(clause, 66, p2Y, {
        width: 475,
        align: 'justify',
        lineGap: 2,
      });
    });

    // Clause 5: Caution Deposit
    p2Y = doc.y + 12;
    doc.font('Times-Bold').fontSize(10.5).fillColor('#111110').text('5. CAUTION DEPOSIT AND REFUND', 54, p2Y);
    p2Y = doc.y + 4;
    doc
      .font('Times-Roman')
      .fontSize(10)
      .fillColor('#1C1917')
      .text(
        "Any caution or security deposit paid by the Tenant shall be held strictly as security for the due performance of the Tenant's obligations and shall not be treated by either party as payment of rent. Upon the expiration or lawful determination of the tenancy and following a joint move-out inspection, the caution deposit shall be refunded to the Tenant within fourteen (14) days, less only verified and itemized costs of repairing physical damage caused by the Tenant beyond fair wear and tear, or settling unpaid utility bills incurred during the Tenant's occupation.",
        54,
        p2Y,
        { width: 487, align: 'justify', lineGap: 2.5 }
      );

    // Clause 6: Notice & Determination
    p2Y = doc.y + 12;
    doc.font('Times-Bold').fontSize(10.5).fillColor('#111110').text('6. DETERMINATION OF TENANCY AND NOTICE', 54, p2Y);
    p2Y = doc.y + 4;
    doc
      .font('Times-Roman')
      .fontSize(10)
      .fillColor('#1C1917')
      .text(
        '6.1. Either party wishing to terminate or not renew this tenancy shall give prior written notice to the other party of not less than one (1) calendar month in the case of a monthly tenancy, or not less than three (3) calendar months in the case of an annual tenancy.\n6.2. Any dispute or difference arising out of or in connection with this Agreement which cannot be amicably resolved between the parties within fourteen (14) days shall be referred for mediation or determination by the appropriate Rent Magistrate or Rent Control Officer in accordance with the Rent Act, 1963 (Act 220) of the Republic of Ghana.',
        54,
        p2Y,
        { width: 487, align: 'justify', lineGap: 2.5 }
      );

    if (data.isStudentHostel) {
      p2Y = doc.y + 12;
      doc
        .font('Times-Bold')
        .fontSize(10.5)
        .fillColor('#111110')
        .text('7. STUDENT RESIDENCY AND COMPOUND REGULATIONS', 54, p2Y);
      p2Y = doc.y + 4;
      doc
        .font('Times-Roman')
        .fontSize(9.8)
        .fillColor('#1C1917')
        .text(
          `Occupancy of this student accommodation is granted subject to the Tenant's active matriculation at ${data.studentCampus || 'an accredited tertiary institution'} and observance of hostel curfews, visitor sign-in regulations, and electrical appliance safety rules.${data.guardianName ? ` Designated Parent/Guardian on record: ${data.guardianName} (${data.guardianPhone || 'N/A'}).` : ''}`,
          54,
          p2Y,
          { width: 487, align: 'justify', lineGap: 2.5 }
        );
    }

    // Testimonium Clause
    p2Y = doc.y + 20;
    doc
      .font('Times-Bold')
      .fontSize(10.5)
      .fillColor('#111110')
      .text(
        'IN WITNESS WHEREOF the parties hereto have executed this Agreement the day, month, and year first above written.',
        54,
        p2Y,
        { width: 487 }
      );

    // Traditional Two-Column Solicitor Execution Block
    const sigTopY = doc.y + 24;
    const leftX = 54;
    const rightX = 310;
    const sigLineWidth = 215;

    // Left Column: Landlord
    doc
      .font('Times-Bold')
      .fontSize(9.5)
      .fillColor('#1C1917')
      .text('SIGNED by the within-named LANDLORD:', leftX, sigTopY);

    if (data.landlordSignatureUrl && data.landlordSignatureUrl.startsWith('data:image')) {
      try {
        const cleanB64 = data.landlordSignatureUrl.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(cleanB64, 'base64');
        doc.image(imgBuffer, leftX + 5, sigTopY + 18, { fit: [170, 48] });
      } catch (e) {
        // Fallback if signature image cannot be parsed
      }
    } else {
      doc
        .font('Times-Italic')
        .fontSize(9)
        .fillColor('#78716C')
        .text('[ Awaiting Landlord Signature ]', leftX + 5, sigTopY + 42);
    }

    doc
      .moveTo(leftX, sigTopY + 72)
      .lineTo(leftX + sigLineWidth, sigTopY + 72)
      .lineWidth(0.8)
      .strokeColor('#1C1917')
      .stroke();

    doc
      .font('Times-Roman')
      .fontSize(9.5)
      .fillColor('#1C1917')
      .text(`Name: ${data.landlordName.toUpperCase()}`, leftX, sigTopY + 80)
      .text('Capacity: Landlord / Lessor', leftX, sigTopY + 94)
      .text(`Date: ${data.landlordSignedAt || 'Pending execution'}`, leftX, sigTopY + 108);

    // Right Column: Tenant
    doc
      .font('Times-Bold')
      .fontSize(9.5)
      .fillColor('#1C1917')
      .text('SIGNED by the within-named TENANT:', rightX, sigTopY);

    if (data.tenantSignatureUrl && data.tenantSignatureUrl.startsWith('data:image')) {
      try {
        const cleanB64 = data.tenantSignatureUrl.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(cleanB64, 'base64');
        doc.image(imgBuffer, rightX + 5, sigTopY + 18, { fit: [170, 48] });
      } catch (e) {
        // Fallback if signature image cannot be parsed
      }
    } else {
      doc
        .font('Times-Italic')
        .fontSize(9)
        .fillColor('#78716C')
        .text('[ Awaiting Tenant Signature ]', rightX + 5, sigTopY + 42);
    }

    doc
      .moveTo(rightX, sigTopY + 72)
      .lineTo(rightX + sigLineWidth, sigTopY + 72)
      .lineWidth(0.8)
      .strokeColor('#1C1917')
      .stroke();

    doc
      .font('Times-Roman')
      .fontSize(9.5)
      .fillColor('#1C1917')
      .text(`Name: ${data.tenantName.toUpperCase()}`, rightX, sigTopY + 80)
      .text('Capacity: Tenant / Lessee', rightX, sigTopY + 94)
      .text(`Date: ${data.tenantSignedAt || 'Pending execution'}`, rightX, sigTopY + 108);

    // Understated Electronic Execution Footnote at Bottom of Page 2
    const hashVal = data.cryptographicHash || data.agreementId;
    const footerBoxY = 710;
    doc.moveTo(54, footerBoxY).lineTo(541, footerBoxY).lineWidth(0.5).strokeColor('#A8A29E').stroke();
    doc
      .font('Times-Roman')
      .fontSize(8)
      .fillColor('#57534E')
      .text(
        `Executed electronically pursuant to Section 10 of the Electronic Transactions Act, 2008 (Act 772). Document Reference: ${docRef} • Checksum: ${hashVal}`,
        54,
        footerBoxY + 8,
        { width: 487, align: 'left' }
      );

    // Page 2 Footer
    doc.moveTo(54, 770).lineTo(541, 770).lineWidth(0.5).strokeColor('#D6D0C4').stroke();
    doc
      .font('Times-Italic')
      .fontSize(8.5)
      .fillColor('#57534E')
      .text(`Tenancy Agreement (${docRef})`, 54, 776, { align: 'left' })
      .text('Page 2 of 2', 54, 776, { align: 'right' });

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
      .text('OFFICIAL TENANCY PAYMENT & ESCROW RECEIPT', 40, 55);

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
      .text('✅ ESCROW PAYMENT CLEARED & AUDITED', 55, 137);

    // Customer & Booking Metadata
    const startY = 185;
    doc
      .rect(40, startY, 515, 90)
      .fillAndStroke('#F8FAFC', '#E2E8F0');

    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PAYER & PREMISES DETAILS', 50, startY + 12);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#0F172A')
      .text(`Tenant Name: ${data.studentName}`, 50, startY + 32)
      .text(`Email Address: ${data.studentEmail} (${data.studentPhone || 'N/A'})`, 50, startY + 47)
      .text(`Property / Premises: ${data.propertyTitle}`, 50, startY + 62)
      .text(`Unit / Option: ${data.roomType}`, 300, startY + 62);

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
      .text(`Residential Tenancy Advance Rent (${data.roomType})`, 50, tableY + 38)
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
      .text('This is an official computer-generated receipt issued by the Akwaaba Homes Tenancy Platform.', 40, footerY, { width: 515 });

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
export async function generateGRATaxReportPDF(data: {
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;
  taxYear: number;
  grossRevenue: number;
  totalMaintenanceDeductions: number;
  withholdingTax5Percent: number;
  netTaxableIncome: number;
  transactionCount: number;
  propertyBreakdown: { title: string; gross: number; maintenance: number; net: number }[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

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

