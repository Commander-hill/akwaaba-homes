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
        `2.1. The rent reserved for the tenancy is GHS ${Number(data.rentAmount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}, paid by the Tenant through the designated settlement channel on behalf of the Landlord.\n2.2. In accordance with Section 20 of the Rent Act, 1963 (Act 220), every payment of rent made under this Agreement shall be acknowledged by an official written or electronic rent receipt issued to the Tenant stating the period covered and the sum received.`,
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
 * Human-engineered fintech/proptech accounting layout (compliant with Rent Act, 1963 Act 220, s. 20)
 */
export async function generateReceiptPDF(data: {
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
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const issueDate = new Date(data.paidAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const receiptNo = data.reference || `RCP-${data.transactionId.slice(0, 8).toUpperCase()}`;
    const fmt = (val: number) =>
      Number(val || 0).toLocaleString('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const totalPaid = Number(data.grossAmount || 0);
    const cautionDeposit = Number(data.cautionDepositAmount || 0);
    const baseRent = data.baseRentAmount !== undefined
      ? Number(data.baseRentAmount)
      : Math.max(0, totalPaid - cautionDeposit);
    const isPaid = ['SUCCESS', 'COMPLETED', 'PAID'].includes((data.paymentStatus || '').toUpperCase());

    const leftX = 48;
    const rightEdge = 547;
    const contentWidth = rightEdge - leftX; // 499

    // ── Top Accent Bar ──
    doc.rect(leftX, 42, contentWidth, 4).fill('#173D32');

    // ── Brand & Document Title (Left) ──
    doc
      .fillColor('#173D32')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('AKWAABAHOMES', leftX, 60, { characterSpacing: 0.8 });

    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('Rent Payment Receipt', leftX, 80);

    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(9)
      .text(`Receipt No: ${receiptNo}   •   Issued: ${issueDate}`, leftX, 104);

    // ── Amount & Status Pill (Right) ──
    const badgeText = isPaid ? 'PAID' : (data.paymentStatus || 'PENDING').toUpperCase();
    const badgeBg = isPaid ? '#ECFDF3' : '#FEF3C7';
    const badgeColor = isPaid ? '#166534' : '#92400E';

    doc.roundedRect(rightEdge - 72, 58, 72, 18, 4).fill(badgeBg);
    doc
      .fillColor(badgeColor)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(badgeText, rightEdge - 72, 63, { width: 72, align: 'center' });

    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(8.5)
      .text('TOTAL PAID', rightEdge - 180, 82, { width: 180, align: 'right' });

    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(`GHS ${fmt(totalPaid)}`, rightEdge - 180, 94, { width: 180, align: 'right' });

    // Divider
    doc.moveTo(leftX, 126).lineTo(rightEdge, 126).lineWidth(0.75).strokeColor('#E5E7EB').stroke();

    // ── Two-Column Counterparty Section (Received From vs. Property & Landlord) ──
    const partyY = 142;
    const colW = 235;
    const col2X = leftX + colW + 29;

    doc
      .fillColor('#6B7280')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('RECEIVED FROM (TENANT)', leftX, partyY, { characterSpacing: 0.6 });

    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(data.studentName, leftX, partyY + 14, { width: colW });

    let leftPartyCurY = partyY + 29;
    doc
      .fillColor('#4B5563')
      .font('Helvetica')
      .fontSize(9)
      .text(data.studentEmail, leftX, leftPartyCurY, { width: colW });
    leftPartyCurY += 13;

    if (data.studentPhone && data.studentPhone !== 'N/A') {
      doc.text(data.studentPhone, leftX, leftPartyCurY, { width: colW });
      leftPartyCurY += 13;
    }
    if (data.studentId || data.studentCampus) {
      const studentMeta = [
        data.studentId ? `ID: ${data.studentId}` : null,
        data.studentCampus || null,
      ]
        .filter(Boolean)
        .join(' • ');
      doc.text(studentMeta, leftX, leftPartyCurY, { width: colW });
    }

    // Right Column: Property & Landlord
    doc
      .fillColor('#6B7280')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('PROPERTY & LANDLORD', col2X, partyY, { characterSpacing: 0.6 });

    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(data.propertyTitle, col2X, partyY + 14, { width: colW });

    let rightPartyCurY = partyY + 29;
    doc
      .fillColor('#4B5563')
      .font('Helvetica')
      .fontSize(9);

    if (data.propertyLocation) {
      doc.text(data.propertyLocation, col2X, rightPartyCurY, { width: colW });
      rightPartyCurY += 13;
    }
    if (data.landlordName) {
      doc.text(`Landlord: ${data.landlordName}`, col2X, rightPartyCurY, { width: colW });
      rightPartyCurY += 13;
    }
    if (data.landlordPhone && data.landlordPhone !== 'N/A') {
      doc.text(`Tel: ${data.landlordPhone}`, col2X, rightPartyCurY, { width: colW });
    }

    // ── 4-Column Tenancy & Allocation Metadata Strip ──
    const stripY = 224;
    const stripH = 48;
    doc.roundedRect(leftX, stripY, contentWidth, stripH, 6).fillAndStroke('#F9FAFB', '#E5E7EB');

    const cellW = contentWidth / 4;
    const periodText =
      data.startDate && data.endDate ? `${data.startDate} – ${data.endDate}` : 'Current Tenancy Term';
    const metaCells = [
      { label: 'ROOM / UNIT TYPE', value: data.roomType || 'Residential Unit' },
      { label: 'ASSIGNED UNIT', value: data.unitAllocation || 'Standard Unit' },
      { label: 'TENANCY PERIOD', value: periodText },
      { label: 'PAYMENT CHANNEL', value: data.paymentMethod || 'Paystack (MoMo / Card)' },
    ];

    metaCells.forEach((cell, idx) => {
      const cx = leftX + idx * cellW + 10;
      if (idx > 0) {
        doc
          .moveTo(leftX + idx * cellW, stripY + 8)
          .lineTo(leftX + idx * cellW, stripY + stripH - 8)
          .lineWidth(0.5)
          .strokeColor('#E5E7EB')
          .stroke();
      }
      doc
        .fillColor('#6B7280')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(cell.label, cx, stripY + 10, { width: cellW - 16 });
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(cell.value, cx, stripY + 23, { width: cellW - 16, ellipsis: true });
    });

    // ── Line-Item Charge Breakdown Table ──
    const tableY = 294;
    doc.rect(leftX, tableY, contentWidth, 26).fill('#F3F4F6');
    doc.moveTo(leftX, tableY + 26).lineTo(rightEdge, tableY + 26).lineWidth(0.75).strokeColor('#D1D5DB').stroke();

    doc
      .fillColor('#374151')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('DESCRIPTION', leftX + 12, tableY + 9)
      .text('TERM / BILLING BASIS', leftX + 250, tableY + 9)
      .text('AMOUNT (GHS)', rightEdge - 120, tableY + 9, { width: 108, align: 'right' });

    let rowY = tableY + 26;

    // Row 1: Base Rent
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text(`Rent — ${data.propertyTitle}`, leftX + 12, rowY + 10, { width: 228 });
    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        [data.roomType, data.unitAllocation].filter(Boolean).join(' • '),
        leftX + 12,
        rowY + 24,
        { width: 228 }
      );
    doc
      .fillColor('#374151')
      .font('Helvetica')
      .fontSize(8.5)
      .text(periodText, leftX + 250, rowY + 16, { width: 145 });
    doc
      .fillColor('#111827')
      .font('Courier-Bold')
      .fontSize(10)
      .text(fmt(baseRent), rightEdge - 120, rowY + 15, { width: 108, align: 'right' });

    rowY += 44;
    doc.moveTo(leftX, rowY).lineTo(rightEdge, rowY).lineWidth(0.5).strokeColor('#E5E7EB').stroke();

    // Row 2: Refundable Security / Caution Deposit (if > 0)
    if (cautionDeposit > 0) {
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('Refundable Security / Caution Deposit', leftX + 12, rowY + 10, { width: 228 });
      doc
        .fillColor('#6B7280')
        .font('Helvetica')
        .fontSize(8.5)
        .text('Refundable deposit subject to move-out inspection', leftX + 12, rowY + 24, { width: 228 });
      doc
        .fillColor('#374151')
        .font('Helvetica')
        .fontSize(8.5)
        .text('One-time refundable', leftX + 250, rowY + 16, { width: 145 });
      doc
        .fillColor('#111827')
        .font('Courier-Bold')
        .fontSize(10)
        .text(fmt(cautionDeposit), rightEdge - 120, rowY + 15, { width: 108, align: 'right' });

      rowY += 44;
      doc.moveTo(leftX, rowY).lineTo(rightEdge, rowY).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
    }

    // ── Summary Totals Block (Right-aligned) ──
    const summaryX = rightEdge - 230;
    let sumY = rowY + 14;

    const drawSummaryLine = (label: string, val: string, bold = false) => {
      doc
        .fillColor(bold ? '#111827' : '#4B5563')
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 10 : 9)
        .text(label, summaryX, sumY, { width: 120, align: 'left' });
      doc
        .fillColor('#111827')
        .font(bold ? 'Courier-Bold' : 'Courier')
        .fontSize(bold ? 10.5 : 9.5)
        .text(val, rightEdge - 108, sumY, { width: 96, align: 'right' });
      sumY += 18;
    };

    drawSummaryLine('Subtotal', `GHS ${fmt(totalPaid)}`);
    drawSummaryLine('Tenant Service Fee', 'GHS 0.00');

    doc.moveTo(summaryX, sumY - 2).lineTo(rightEdge, sumY - 2).lineWidth(0.75).strokeColor('#111827').stroke();
    sumY += 6;
    drawSummaryLine('Total Paid', `GHS ${fmt(totalPaid)}`, true);
    drawSummaryLine('Balance Due', isPaid ? 'GHS 0.00' : `GHS ${fmt(totalPaid)}`);

    // ── Statutory Compliance Box ──
    const noteY = Math.max(sumY + 24, 480);
    doc.roundedRect(leftX, noteY, contentWidth, 68, 6).fillAndStroke('#F8FAFC', '#E2E8F0');

    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('Statutory Rent Receipt (Rent Act, 1963 Act 220)', leftX + 14, noteY + 12);

    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        'Issued in compliance with Section 20 of the Rent Act, 1963 (Act 220). This document serves as official verification of rent and deposit payment for the tenancy period stated above.',
        leftX + 14,
        noteY + 26,
        { width: contentWidth - 28, lineGap: 2 }
      );

    if (data.checkInCode) {
      doc
        .fillColor('#173D32')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`Gatehouse Check-In Clearance Code: ${data.checkInCode}`, leftX + 14, noteY + 50);
    }

    // ── Bottom Audit Footer ──
    doc.moveTo(leftX, 755).lineTo(rightEdge, 755).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(8)
      .text(`Reference: ${receiptNo}   •   Transaction ID: ${data.transactionId}`, leftX, 764)
      .text('AkwaabaHomes — Verified Rental Marketplace', leftX, 764, { width: contentWidth, align: 'right' });

    doc.end();
  });
}

/**
 * Generate official GRA Tax Statement PDF for Landlords
 * Crafted in classical Ghanaian Statutory Tax Return Schedule format (Income Tax Act, 2015 Act 896)
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
    const doc = new PDFDocument({ margin: 54, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const issueDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const scheduleRef = `GRA/RENT/${data.taxYear}/${Buffer.from(data.landlordEmail || 'LANDLORD').toString('hex').slice(0, 6).toUpperCase()}`;

    const fmt = (n: number) =>
      Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Classical Statutory Letterhead
    doc
      .fillColor('#111827')
      .font('Times-Bold')
      .fontSize(10)
      .text('REPUBLIC OF GHANA  •  GHANA REVENUE AUTHORITY (DOMESTIC TAX REVENUE DIVISION)', 54, 54, {
        characterSpacing: 0.8,
      });

    doc
      .font('Times-Bold')
      .fontSize(15)
      .text('ANNUAL SCHEDULE OF RENTAL INCOME & ALLOWABLE DEDUCTIONS', 54, 70);

    doc
      .font('Times-Italic')
      .fontSize(9.5)
      .fillColor('#374151')
      .text('Prepared Pursuant to the Income Tax Act, 2015 (Act 896) — Residential & Commercial Rent Tax Return', 54, 89);

    // Double Rule Divider
    doc.moveTo(54, 108).lineTo(541, 108).lineWidth(1.5).strokeColor('#111827').stroke();
    doc.moveTo(54, 111).lineTo(541, 111).lineWidth(0.5).strokeColor('#111827').stroke();

    // Part I — Taxpayer Identification Schedule
    const part1Y = 124;
    doc
      .font('Times-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text('PART I — PARTICULARS OF LANDLORD / TAXPAYER', 54, part1Y);

    const metaRows: [string, string][] = [
      ['Name of Taxpayer / Landlord', data.landlordName],
      ['Registered Contact Particulars', `${data.landlordPhone || 'On File'}  |  ${data.landlordEmail}`],
      ['Year of Assessment', `1st January ${data.taxYear} to 31st December ${data.taxYear}`],
      ['Schedule Reference & Issue Date', `${scheduleRef}  (Issued: ${issueDate})`],
      ['Audited Tenancy Settlements', `${data.transactionCount} Verified Rent Remittance(s)`],
    ];

    let curY = part1Y + 15;
    const col1W = 175;
    const col2W = 312;
    const rowH = 22;

    metaRows.forEach(([label, val]) => {
      doc.rect(54, curY, col1W, rowH).fillAndStroke('#F9FAFB', '#9CA3AF');
      doc.rect(54 + col1W, curY, col2W, rowH).fillAndStroke('#FFFFFF', '#9CA3AF');

      doc
        .fillColor('#111827')
        .font('Times-Bold')
        .fontSize(9)
        .text(label, 62, curY + 6, { width: col1W - 16 });

      doc
        .fillColor('#111827')
        .font('Times-Roman')
        .fontSize(9)
        .text(val, 54 + col1W + 10, curY + 6, { width: col2W - 20 });

      curY += rowH;
    });

    // Part II — Statutory Tax Computation Summary
    const part2Y = curY + 20;
    doc
      .font('Times-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text('PART II — SUMMARY OF GROSS RENTAL RECEIPTS & TAX COMPUTATION', 54, part2Y);

    const compRows: [string, string, boolean][] = [
      ['01. Gross Rental Revenue Collected (Verified Rent Settlements)', `GHS ${fmt(data.grossRevenue)}`, false],
      ['02. Less: Allowable Property Maintenance & Repair Deductions', `(GHS ${fmt(data.totalMaintenanceDeductions)})`, false],
      ['03. Net Assessable Rental Income', `GHS ${fmt(data.netTaxableIncome)}`, true],
      ['04. Estimated Statutory Rent Tax Liability (Withholding Assessment)', `GHS ${fmt(data.withholdingTax5Percent)}`, true],
    ];

    let compY = part2Y + 15;
    compRows.forEach(([label, amountStr, isBold]) => {
      doc.rect(54, compY, 357, 24).fillAndStroke(isBold ? '#F3F4F6' : '#FFFFFF', '#9CA3AF');
      doc.rect(411, compY, 130, 24).fillAndStroke(isBold ? '#F3F4F6' : '#FFFFFF', '#9CA3AF');

      doc
        .fillColor('#111827')
        .font(isBold ? 'Times-Bold' : 'Times-Roman')
        .fontSize(9.5)
        .text(label, 62, compY + 7, { width: 340 });

      doc
        .fillColor('#111827')
        .font(isBold ? 'Times-Bold' : 'Times-Roman')
        .fontSize(9.5)
        .text(amountStr, 419, compY + 7, { width: 114, align: 'right' });

      compY += 24;
    });

    // Part III — Property-by-Property Schedule
    const part3Y = compY + 22;
    doc
      .font('Times-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text('PART III — SCHEDULE OF DEMISED PROPERTIES & NET YIELD', 54, part3Y);

    const tableY = part3Y + 15;
    doc.rect(54, tableY, 217, 22).fillAndStroke('#F3F4F6', '#4B5563');
    doc.rect(271, tableY, 90, 22).fillAndStroke('#F3F4F6', '#4B5563');
    doc.rect(361, tableY, 90, 22).fillAndStroke('#F3F4F6', '#4B5563');
    doc.rect(451, tableY, 90, 22).fillAndStroke('#F3F4F6', '#4B5563');

    doc
      .fillColor('#111827')
      .font('Times-Bold')
      .fontSize(8.5)
      .text('PROPERTY / COMPOUND DESIGNATION', 60, tableY + 7)
      .text('GROSS (GHS)', 277, tableY + 7, { width: 78, align: 'right' })
      .text('REPAIRS (GHS)', 367, tableY + 7, { width: 78, align: 'right' })
      .text('NET (GHS)', 457, tableY + 7, { width: 78, align: 'right' });

    let rowY = tableY + 22;
    const properties = data.propertyBreakdown.length > 0
      ? data.propertyBreakdown
      : [{ title: 'Consolidated Residential Holdings', gross: data.grossRevenue, maintenance: data.totalMaintenanceDeductions, net: data.netTaxableIncome }];

    properties.slice(0, 8).forEach((prop) => {
      doc.rect(54, rowY, 217, 22).strokeColor('#9CA3AF').stroke();
      doc.rect(271, rowY, 90, 22).strokeColor('#9CA3AF').stroke();
      doc.rect(361, rowY, 90, 22).strokeColor('#9CA3AF').stroke();
      doc.rect(451, rowY, 90, 22).strokeColor('#9CA3AF').stroke();

      doc
        .fillColor('#111827')
        .font('Times-Roman')
        .fontSize(9)
        .text(prop.title.slice(0, 38), 60, rowY + 6)
        .text(fmt(prop.gross), 277, rowY + 6, { width: 78, align: 'right' })
        .text(fmt(prop.maintenance), 367, rowY + 6, { width: 78, align: 'right' })
        .font('Times-Bold')
        .text(fmt(prop.net), 457, rowY + 6, { width: 78, align: 'right' });

      rowY += 22;
    });

    // Declaration & Comptroller Sign-off
    const declY = Math.min(rowY + 28, 665);
    doc
      .font('Times-Bold')
      .fontSize(9)
      .fillColor('#111827')
      .text('STATUTORY DECLARATION & AUDIT CERTIFICATION:', 54, declY);

    doc
      .font('Times-Roman')
      .fontSize(8.5)
      .fillColor('#374151')
      .text(
        'I hereby declare that the particulars of gross rental receipts and maintenance disbursements set forth in this Schedule represent a true and complete extract of the audited tenancy ledger for the Year of Assessment stated above, prepared for submission to the Ghana Revenue Authority (GRA).',
        54,
        declY + 13,
        { width: 280, align: 'justify', lineGap: 2 }
      );

    doc.moveTo(360, declY + 38).lineTo(541, declY + 38).lineWidth(0.75).strokeColor('#111827').stroke();
    doc
      .font('Times-Bold')
      .fontSize(8.5)
      .fillColor('#111827')
      .text('SIGNATURE OF TAXPAYER / LANDLORD', 360, declY + 43, { width: 181, align: 'center' })
      .font('Times-Roman')
      .fontSize(8)
      .fillColor('#4B5563')
      .text(`Date: ${issueDate}`, 360, declY + 55, { width: 181, align: 'center' });

    // Footer Line
    doc.moveTo(54, 745).lineTo(541, 745).lineWidth(0.5).strokeColor('#D1D5DB').stroke();
    doc
      .font('Times-Roman')
      .fontSize(8)
      .fillColor('#6B7280')
      .text(`Schedule Ref: ${scheduleRef}  |  Akwaaba Homes Tenancy Audit Ledger`, 54, 754)
      .text('Page 1 of 1', 54, 754, { width: 487, align: 'right' });

    doc.end();
  });
}

