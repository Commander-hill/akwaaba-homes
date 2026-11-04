import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { getQRCodeMatrix } from './qr';

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

    // ── Resolve Akwaaba Homes Watermark & Coat of Arms Logos ──
    const possibleLogoPaths = [
      path.resolve(__dirname, '../../assets/logo-light.png'),
      path.resolve(__dirname, '../assets/logo-light.png'),
      path.resolve(process.cwd(), 'assets/logo-light.png'),
      path.resolve(process.cwd(), 'backend/assets/logo-light.png'),
      path.resolve(process.cwd(), '../frontend/public/logo-light.png'),
      path.resolve(process.cwd(), 'frontend/public/logo-light.png'),
      path.resolve(__dirname, '../../../../frontend/public/logo-light.png'),
      path.resolve(__dirname, '../../../frontend/public/logo-light.png'),
    ];
    const logoLightPath = possibleLogoPaths.find((p) => fs.existsSync(p));

    const possibleCoatPaths = [
      path.resolve(__dirname, '../../assets/coat-of-arms.png'),
      path.resolve(__dirname, '../assets/coat-of-arms.png'),
      path.resolve(process.cwd(), 'assets/coat-of-arms.png'),
      path.resolve(process.cwd(), 'backend/assets/coat-of-arms.png'),
      path.resolve(process.cwd(), '../frontend/public/images/agreements/coat-of-arms.png'),
      path.resolve(process.cwd(), 'frontend/public/images/agreements/coat-of-arms.png'),
      path.resolve(__dirname, '../../../../frontend/public/images/agreements/coat-of-arms.png'),
      path.resolve(__dirname, '../../../frontend/public/images/agreements/coat-of-arms.png'),
    ];
    const coatOfArmsPath = possibleCoatPaths.find((p) => fs.existsSync(p));

    const drawWatermark = () => {
      if (logoLightPath) {
        try {
          doc.save();
          doc.opacity(0.16);
          const watermarkSize = 380;
          const wmX = (595.28 - watermarkSize) / 2;
          const wmY = (841.89 - watermarkSize) / 2;
          doc.image(logoLightPath, wmX, wmY, { width: watermarkSize, height: watermarkSize });
          doc.restore();
        } catch {
          // Fallback silently if watermark image cannot be parsed
        }
      }
    };

    const drawFooter = (pageNum: number) => {
      doc.moveTo(54, 770).lineTo(541, 770).lineWidth(0.5).strokeColor('#D6D0C4').stroke();
      doc
        .font('Times-Italic')
        .fontSize(8.5)
        .fillColor('#57534E')
        .text(`Tenancy Agreement (${docRef})`, 54, 776, { align: 'left' })
        .text(`Page ${pageNum} of 4`, 54, 776, { align: 'right' });
    };

    const drawContinuationHeader = (subtitle: string) => {
      doc
        .font('Times-Roman')
        .fontSize(8.5)
        .fillColor('#57534E')
        .text(`INSTRUMENT REF: ${docRef}`, 54, 38, { align: 'left' })
        .text(subtitle.toUpperCase(), 54, 38, { align: 'right' });
      doc.moveTo(54, 50).lineTo(541, 50).lineWidth(0.5).strokeColor('#A8A29E').stroke();
    };

    // ════════════════════════════════════════════════════════════════
    // PAGE 1 OF 4: RECITALS, PARTIES, SCHEDULE 1 & GRANT OF TENANCY
    // ════════════════════════════════════════════════════════════════
    drawWatermark();

    // Top Metadata Folio Line
    doc
      .font('Times-Roman')
      .fontSize(8.5)
      .fillColor('#57534E')
      .text(`INSTRUMENT REF: ${docRef}`, 54, 36, { align: 'left' })
      .text('REPUBLIC OF GHANA', 54, 36, { align: 'right' });

    doc.moveTo(54, 48).lineTo(541, 48).lineWidth(0.5).strokeColor('#A8A29E').stroke();

    // Centered Dual Logos with Golden Vertical Divider
    const logoW = 44;
    const logoH = 38;
    const midX = 595.28 / 2; // 297.64
    const logoGap = 16;
    const coatX = midX - logoGap - logoW;
    const akwX = midX + logoGap;
    const logoTopY = 54;

    if (coatOfArmsPath) {
      try {
        doc.image(coatOfArmsPath, coatX, logoTopY, { fit: [logoW, logoH], align: 'center' });
      } catch {
        // Fallback silently if image cannot be rendered
      }
    }

    doc
      .moveTo(midX, logoTopY + 2)
      .lineTo(midX, logoTopY + logoH - 2)
      .lineWidth(1)
      .strokeColor('#C8A24A')
      .stroke();

    if (logoLightPath) {
      try {
        doc.image(logoLightPath, akwX, logoTopY, { fit: [logoW, logoH], align: 'center' });
      } catch {
        // Fallback silently if image cannot be rendered
      }
    }

    // Title Block
    doc
      .font('Times-Bold')
      .fontSize(9.5)
      .fillColor('#292524')
      .text('REPUBLIC OF GHANA', 54, 100, { align: 'center', characterSpacing: 2 });

    doc
      .font('Times-Bold')
      .fontSize(15)
      .fillColor('#111110')
      .text('RESIDENTIAL TENANCY AGREEMENT', 54, 114, { align: 'center', characterSpacing: 1.2 });

    doc
      .font('Times-Italic')
      .fontSize(8)
      .fillColor('#57534E')
      .text(
        'Made pursuant to the Rent Act, 1963 (Act 220), Conveyancing Act, 1973 (NRCD 175) and Electronic Transactions Act, 2008 (Act 772)',
        54,
        133,
        { align: 'center' }
      );

    // Double Rule Divider
    doc.moveTo(54, 147).lineTo(541, 147).lineWidth(1.2).strokeColor('#1C1917').stroke();
    doc.moveTo(54, 150).lineTo(541, 150).lineWidth(0.5).strokeColor('#1C1917').stroke();

    // Opening Recital & Parties
    let y = 160;
    doc
      .font('Times-Roman')
      .fontSize(9.5)
      .fillColor('#1C1917')
      .text(
        `THIS RESIDENTIAL TENANCY AGREEMENT is made on ${executionDate} BETWEEN ${data.landlordName.toUpperCase()} (Telephone: ${data.landlordPhone || 'on file'}) of the Republic of Ghana, hereinafter referred to as "the Landlord" (which expression shall, where the context so admits, include the Landlord's heirs, personal representatives, successors-in-title, and assigns) of the one part;`,
        54,
        y,
        { width: 487, align: 'justify', lineGap: 2.5 }
      );

    y = doc.y + 6;
    doc.text(
      `AND ${data.tenantName.toUpperCase()} (Telephone: ${data.tenantPhone || 'on file'}; Electronic Mail: ${data.tenantEmail})${data.studentCampus ? `, Student of ${data.studentCampus} (ID: ${data.studentId || 'on file'})` : ''}, hereinafter referred to as "the Tenant" (which expression shall, where the context so admits, include the Tenant's personal representatives and permitted assigns) of the other part.`,
      54,
      y,
      { width: 487, align: 'justify', lineGap: 2.5 }
    );

    // WHEREAS Recitals
    y = doc.y + 8;
    doc.font('Times-Bold').fontSize(9.5).text('WHEREAS:', 54, y);
    y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(9)
      .text(
        `I. The Landlord is the lawful owner or registered lessor of the residential property known as ${data.propertyTitle}, situated at ${data.propertyAddress} in the Republic of Ghana (hereinafter referred to as "the Premises").`,
        68,
        y,
        { width: 473, align: 'justify', lineGap: 2 }
      );
    y = doc.y + 3;
    doc.text(
      'II. The Landlord has agreed to let and the Tenant has agreed to take the Premises for private residential purposes at the agreed rent and upon the covenants and conditions hereinafter contained.',
      68,
      y,
      { width: 473, align: 'justify', lineGap: 2 }
    );
    y = doc.y + 3;
    doc.text(
      'III. The parties intend that this Agreement shall take effect as a binding legal tenancy under the laws of the Republic of Ghana, incorporating statutory tenant protections under the Rent Act, 1963 (Act 220).',
      68,
      y,
      { width: 473, align: 'justify', lineGap: 2 }
    );

    y = doc.y + 8;
    doc.font('Times-Bold').fontSize(9.5).text('NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:', 54, y);

    // Schedule 1: Tenancy Particulars
    y = doc.y + 6;
    doc.font('Times-Bold').fontSize(9).text('SCHEDULE 1: SCHEDULE OF TENANCY PARTICULARS', 54, y);
    y = doc.y + 4;

    const scheduleRows = [
      ['1. Description & Location of Premises', `${data.propertyTitle}, situated at ${data.propertyAddress}`],
      ['2. Unit / Accommodation Category', data.roomType || 'Self-Contained Residential Unit'],
      ['3. Term of Tenancy', `From ${data.startDate} to ${data.endDate}`],
      ['4. Agreed Rent for the Term', `GHS ${Number(data.rentAmount).toLocaleString('en-GH', { minimumFractionDigits: 2 })} (Ghana Cedis)`],
      ['5. Permitted Use', 'Private Residential Occupation Only'],
    ];

    const col1Width = 180;
    const col2Width = 307;
    const rowHeight = 18;

    scheduleRows.forEach(([label, val]) => {
      doc.rect(54, y, col1Width, rowHeight).fillAndStroke('#F5F2EB', '#A8A29E');
      doc.rect(54 + col1Width, y, col2Width, rowHeight).stroke('#A8A29E');

      doc
        .font('Times-Bold')
        .fontSize(8.5)
        .fillColor('#292524')
        .text(label, 60, y + 4.5, { width: col1Width - 12 });

      doc
        .font('Times-Roman')
        .fontSize(8.5)
        .fillColor('#1C1917')
        .text(val, 54 + col1Width + 8, y + 4.5, { width: col2Width - 16 });

      y += rowHeight;
    });

    // Clause 1: Grant of Tenancy and Term
    y += 10;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('1. GRANT OF TENANCY AND TERM', 54, y);
    y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(9)
      .fillColor('#1C1917')
      .text(
        `1.1. In consideration of the rent hereby reserved and the covenants on the part of the Tenant hereinafter contained, the Landlord hereby lets unto the Tenant the Premises described in Schedule 1 hereto, TO HOLD the same unto the Tenant from ${data.startDate} until ${data.endDate}, unless earlier determined in accordance with the provisions of this Agreement or the Rent Act, 1963 (Act 220).\n1.2. The Tenant shall have exclusive possession and peaceful enjoyment of the designated residential unit during the subsistence of this tenancy, subject strictly to the terms and covenants herein agreed.`,
        54,
        y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    drawFooter(1);

    // ════════════════════════════════════════════════════════════════
    // PAGE 2 OF 4: RENT ADVANCE, TENANT COVENANTS & LANDLORD COVENANTS
    // ════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 54, size: 'A4' });
    drawWatermark();
    drawContinuationHeader('Part II — Rent, Statutory Advance & Covenants');

    let p2Y = 62;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('2. RENT, STATUTORY ADVANCE & OFFICIAL RECEIPTS', 54, p2Y);
    p2Y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(8.8)
      .fillColor('#1C1917')
      .text(
        `2.1. The rent reserved for the tenancy is GHS ${Number(data.rentAmount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}, payable through the designated electronic settlement platform on behalf of the Landlord.\n` +
        `2.2. In strict compliance with Section 25(5) of the Rent Act, 1963 (Act 220), the Landlord shall not demand, receive, or require payment of rent advance exceeding statutory limits.\n` +
        `2.3. In accordance with Section 20 of the Rent Act, 1963 (Act 220), every payment of rent made under this Agreement shall be acknowledged by an official written or electronic rent receipt issued to the Tenant specifying the date of payment, period covered, and exact sum received.\n` +
        `2.4. Pursuant to Section 19 of the Rent Act, 1963 (Act 220), the Landlord shall not unilaterally increase the rent during the subsistence of this tenancy term without prior assessment by the Rent Control Division or mutual written addendum.`,
        54,
        p2Y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    p2Y = doc.y + 8;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text("3. TENANT'S COVENANTS", 54, p2Y);
    p2Y = doc.y + 3;
    doc.font('Times-Roman').fontSize(8.8).text('The Tenant hereby covenants with the Landlord as follows:', 54, p2Y);

    const tenantClauses = [
      '3.1. Punctual Payment of Rent: To pay the reserved rent punctually as stipulated in Schedule 1 without any unlawful set-off, deduction, or delay.',
      '3.2. Care of Interior & Fixtures: To keep the interior of the Premises, including doors, locks, glazing, sanitary installations, and electrical fittings in clean and tenantable repair (fair wear and tear excepted).',
      '3.3. Prohibition of Structural Alterations: Not to make structural alterations, additions, or changes to external locks without the prior written consent of the Landlord.',
      '3.4. Absolute Prohibition on Subletting: Not to assign, underlet, or part with possession of the Premises or any room therein to any third party without express written permission of the Landlord (Section 22 of Act 220).',
      '3.5. Good Neighbourliness & Lawful Use: Not to cause nuisance, annoyance, or offensive disturbance to neighbours, nor use the Premises for any illegal, commercial, or immoral activity.',
      "3.6. Right of Inspection on Prior Notice: To permit the Landlord or authorized agents, upon at least twenty-four (24) hours' prior notice, to enter at reasonable daytime hours to examine the state of repair.",
      "3.7. Surrender of Possession: Peaceably to yield up the Premises with all keys and Landlord's fixtures in good tenantable order at the determination of the tenancy.",
    ];

    tenantClauses.forEach((cl) => {
      p2Y = doc.y + 3.5;
      doc.font('Times-Roman').fontSize(8.8).fillColor('#1C1917').text(cl, 64, p2Y, {
        width: 477,
        align: 'justify',
        lineGap: 1.8,
      });
    });

    p2Y = doc.y + 8;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text("4. LANDLORD'S COVENANTS", 54, p2Y);
    p2Y = doc.y + 3;
    doc.font('Times-Roman').fontSize(8.8).text('The Landlord hereby covenants with the Tenant as follows:', 54, p2Y);

    const landlordClauses = [
      "4.1. Covenant for Quiet Enjoyment: That the Tenant, paying rent and observing covenants, shall peaceably and quietly hold and enjoy the Premises without unlawful interruption or harassment by the Landlord.",
      '4.2. Structural and External Repairs: To keep the roof, foundation, main walls, external drainage, and primary plumbing and electrical distribution infrastructure in good structural order.',
      '4.3. Rates and Ground Taxes: To punctually pay all property rates, municipal tenement assessments, and statutory ground rents assessed against the Premises.',
      '4.4. Prohibition of Self-Help Evictions: Not to lock out the Tenant, disconnect essential electricity or water supplies, or remove doors or roofing, adhering strictly to the Rent Act, 1963 (Act 220).',
      '4.5. Prompt Remediation of Safety Hazards: To remediate within reasonable notice any structural defect or hazard jeopardizing safety, sanitary fitness, or structural integrity.',
    ];

    landlordClauses.forEach((cl) => {
      p2Y = doc.y + 3.5;
      doc.font('Times-Roman').fontSize(8.8).fillColor('#1C1917').text(cl, 64, p2Y, {
        width: 477,
        align: 'justify',
        lineGap: 1.8,
      });
    });

    drawFooter(2);

    // ════════════════════════════════════════════════════════════════
    // PAGE 3 OF 4: CAUTION DEPOSIT, UTILITIES, HOUSE RULES & NOTICE
    // ════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 54, size: 'A4' });
    drawWatermark();
    drawContinuationHeader('Part III — Deposit, Utilities & Property Governance');

    let p3Y = 62;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('5. CAUTION DEPOSIT ESCROW AND REFUND PROTOCOL', 54, p3Y);
    p3Y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(8.8)
      .fillColor('#1C1917')
      .text(
        '5.1. Any caution or security deposit deposited by the Tenant shall be held in secure escrow solely as security for the faithful performance of the Tenant\'s covenants and shall under no circumstance be treated as rent.\n' +
        '5.2. Upon the determination of the tenancy and completion of the joint exit inspection, the caution deposit shall be refunded to the Tenant within fourteen (14) calendar days.\n' +
        '5.3. Deductions from the caution deposit are strictly restricted to verified, itemized expenses incurred to rectify physical damage caused by the Tenant beyond fair wear and tear, or to settle certified outstanding utility bills attributable to the Tenant\'s occupancy.',
        54,
        p3Y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    p3Y = doc.y + 8;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('6. UTILITIES, SUB-METERS AND ESSENTIAL SERVICES', 54, p3Y);
    p3Y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(8.8)
      .fillColor('#1C1917')
      .text(
        '6.1. Electricity Sub-Metering: The Tenant shall be responsible for purchasing ECG electricity recharge tokens for the dedicated prepaid sub-meter allocated to the Premises and shall operate all appliances safely without overloading circuits.\n' +
        '6.2. Water Supply & Sanitation: The Landlord shall maintain functional connectivity to the Ghana Water Company Limited (GWCL) mains or auxiliary borehole water storage tanks. The Tenant shall practice water conservation and promptly notify the Landlord of any plumbing leaks or pressure anomalies.\n' +
        '6.3. Waste Management: The Tenant shall bag and deposit domestic refuse into designated municipal collection bins and maintain clean sanitary conditions within the unit and adjoining corridors.',
        54,
        p3Y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    p3Y = doc.y + 8;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('7. RESIDENCE AND COMPOUND REGULATIONS', 54, p3Y);
    p3Y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(8.8)
      .fillColor('#1C1917')
      .text(
        '7.1. Security and Access: Main compound gates shall be secured at designated hours. Tenants and their visitors shall observe security protocols. Overnight guests exceeding three (3) consecutive nights require advance notification to the property manager.\n' +
        '7.2. Fire and Environmental Safety: No open coal pot cooking, kerosene heaters, or storage of volatile petroleum fuel shall be permitted within residential quarters. Smoke alarms and fire extinguishers on site must remain unobstructed.\n' +
        `7.3. Student Accommodation Provisions: Where the Premises is designated as student housing, tenancy is granted subject to active matriculation at ${data.studentCampus || 'an accredited tertiary institution'}. Quiet hours shall be observed from 10:00 PM to 6:00 AM daily.${data.guardianName ? ` Emergency Guardian on record: ${data.guardianName} (Phone: ${data.guardianPhone || 'N/A'}).` : ''}`,
        54,
        p3Y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    p3Y = doc.y + 8;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('8. DETERMINATION OF TENANCY AND NOTICE TO QUIT', 54, p3Y);
    p3Y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(8.8)
      .fillColor('#1C1917')
      .text(
        '8.1. Statutory Notice: Either party intending not to renew or wishing to determine this tenancy shall serve written notice of not less than one (1) calendar month in the case of a monthly tenancy, or not less than three (3) calendar months in the case of an annual tenancy.\n' +
        '8.2. Default and Forfeiture: If the reserved rent remains unpaid for thirty (30) days after becoming due, or if the Tenant persistently breaches any covenant herein, the Landlord may initiate statutory recovery of possession proceedings pursuant to the Rent Act, 1963 (Act 220).\n' +
        '8.3. Move-Out Clearance: Upon vacating the Premises, the Tenant shall hand over all sets of keys, settle final utility readings, and participate in a final joint exit condition assessment.',
        54,
        p3Y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    drawFooter(3);

    // ════════════════════════════════════════════════════════════════
    // PAGE 4 OF 4: DISPUTE RESOLUTION, INVENTORY & EXECUTION
    // ════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 54, size: 'A4' });
    drawWatermark();
    drawContinuationHeader('Part IV — Dispute Resolution, Inventory & Execution');

    let p4Y = 62;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('9. DISPUTE RESOLUTION AND RENT CONTROL CONCILIATION', 54, p4Y);
    p4Y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(8.8)
      .fillColor('#1C1917')
      .text(
        '9.1. Amicable Conciliation: Any dispute, claim, or difference arising out of this Agreement shall in the first instance be submitted to good-faith mediation between the parties or through the Akwaaba Homes dispute conciliation system within fourteen (14) days.\n' +
        '9.2. Statutory Referral: In default of amicable settlement, the dispute shall be referred to the Rent Control Officer or District Rent Magistrate having jurisdiction over the Premises under the Rent Act, 1963 (Act 220).\n' +
        '9.3. Governing Law: This Agreement shall be governed by, construed, and enforced in accordance with the substantive laws of the Republic of Ghana.',
        54,
        p4Y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    p4Y = doc.y + 6;
    doc.font('Times-Bold').fontSize(9.5).fillColor('#111110').text('10. ELECTRONIC EXECUTION AND STATUTORY VALIDITY', 54, p4Y);
    p4Y = doc.y + 3;
    doc
      .font('Times-Roman')
      .fontSize(8.8)
      .fillColor('#1C1917')
      .text(
        'This Agreement is executed electronically pursuant to Section 10 of the Electronic Transactions Act, 2008 (Act 772). The parties expressly agree that digital signatures, electronic consent timestamps, and cryptographic SHA-256 hashes constitute conclusive proof of authentic execution and legal enforceability.',
        54,
        p4Y,
        { width: 487, align: 'justify', lineGap: 2.2 }
      );

    // Schedule 2: Move-In Fixtures & Inventory Record
    p4Y = doc.y + 6;
    doc.font('Times-Bold').fontSize(9).text('SCHEDULE 2: SCHEDULE OF FIXTURES & MOVE-IN INVENTORY RECORD', 54, p4Y);
    p4Y = doc.y + 4;

    const inventoryRows = [
      ['1. Keys & Access Control', 'Main entrance key, room key, deadbolt, security gate remote/key (Complete & functional)'],
      ['2. Electrical Fittings', 'Ceiling lighting points, wall sockets, light switches, dedicated ECG sub-meter (Inspected & working)'],
      ['3. Sanitary Installations', 'Water closet, wash basin, taps, shower rose, drain traps, mirrors (Clean & leak-free)'],
      ['4. Structural & Joinery', 'Doors, glazed windows, secure latches, interior paint surfaces, wardrobes (Good condition)'],
      ['5. Compound Amenities', 'Compound perimeter lighting, refuse bin allocation, water storage overhead tank connection'],
    ];

    const invCol1 = 150;
    const invCol2 = 337;
    const invRowH = 17;

    inventoryRows.forEach(([cat, desc]) => {
      doc.rect(54, p4Y, invCol1, invRowH).fillAndStroke('#F5F2EB', '#A8A29E');
      doc.rect(54 + invCol1, p4Y, invCol2, invRowH).stroke('#A8A29E');

      doc
        .font('Times-Bold')
        .fontSize(8.2)
        .fillColor('#292524')
        .text(cat, 60, p4Y + 4, { width: invCol1 - 10 });

      doc
        .font('Times-Roman')
        .fontSize(8.2)
        .fillColor('#1C1917')
        .text(desc, 54 + invCol1 + 6, p4Y + 4, { width: invCol2 - 12 });

      p4Y += invRowH;
    });

    // Testimonium Clause
    p4Y = doc.y + 10;
    doc
      .font('Times-Bold')
      .fontSize(9.5)
      .fillColor('#111110')
      .text(
        'IN WITNESS WHEREOF the Landlord and the Tenant have hereunto executed this Indenture under their respective hands or electronic signatures the day, month, and year first above written.',
        54,
        p4Y,
        { width: 487, align: 'justify' }
      );

    // Two-Column Solicitor Execution Block
    const sigTopY = doc.y + 14;
    const leftX = 54;
    const rightX = 308;
    const sigLineWidth = 220;

    // Left Column: Landlord
    doc
      .font('Times-Bold')
      .fontSize(9)
      .fillColor('#1C1917')
      .text('SIGNED by the within-named LANDLORD:', leftX, sigTopY);

    if (data.landlordSignatureUrl && data.landlordSignatureUrl.startsWith('data:image')) {
      try {
        const cleanB64 = data.landlordSignatureUrl.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(cleanB64, 'base64');
        doc.image(imgBuffer, leftX + 4, sigTopY + 14, { fit: [160, 42] });
      } catch {
        // Fallback if signature image cannot be parsed
      }
    } else {
      doc
        .font('Times-Italic')
        .fontSize(8.5)
        .fillColor('#78716C')
        .text('[ Awaiting Landlord Signature ]', leftX + 4, sigTopY + 30);
    }

    doc
      .moveTo(leftX, sigTopY + 60)
      .lineTo(leftX + sigLineWidth, sigTopY + 60)
      .lineWidth(0.8)
      .strokeColor('#1C1917')
      .stroke();

    doc
      .font('Times-Roman')
      .fontSize(8.5)
      .fillColor('#1C1917')
      .text(`Name: ${data.landlordName.toUpperCase()}`, leftX, sigTopY + 66)
      .text('Capacity: Landlord / Lessor', leftX, sigTopY + 78)
      .text(`Date: ${data.landlordSignedAt || 'Pending execution'}`, leftX, sigTopY + 90);

    // Right Column: Tenant
    doc
      .font('Times-Bold')
      .fontSize(9)
      .fillColor('#1C1917')
      .text('SIGNED by the within-named TENANT:', rightX, sigTopY);

    if (data.tenantSignatureUrl && data.tenantSignatureUrl.startsWith('data:image')) {
      try {
        const cleanB64 = data.tenantSignatureUrl.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(cleanB64, 'base64');
        doc.image(imgBuffer, rightX + 4, sigTopY + 14, { fit: [160, 42] });
      } catch {
        // Fallback if signature image cannot be parsed
      }
    } else {
      doc
        .font('Times-Italic')
        .fontSize(8.5)
        .fillColor('#78716C')
        .text('[ Awaiting Tenant Signature ]', rightX + 4, sigTopY + 30);
    }

    doc
      .moveTo(rightX, sigTopY + 60)
      .lineTo(rightX + sigLineWidth, sigTopY + 60)
      .lineWidth(0.8)
      .strokeColor('#1C1917')
      .stroke();

    doc
      .font('Times-Roman')
      .fontSize(8.5)
      .fillColor('#1C1917')
      .text(`Name: ${data.tenantName.toUpperCase()}`, rightX, sigTopY + 66)
      .text('Capacity: Tenant / Lessee', rightX, sigTopY + 78)
      .text(`Date: ${data.tenantSignedAt || 'Pending execution'}`, rightX, sigTopY + 90);

    // Cryptographic SHA-256 Audit Seal Box
    const hashVal = data.cryptographicHash || data.agreementId;
    const certBoxY = sigTopY + 106;
    doc.rect(54, certBoxY, 487, 36).fillAndStroke('#FAF8F3', '#D6D0C4');

    doc
      .font('Times-Bold')
      .fontSize(8)
      .fillColor('#0F5132')
      .text('DIGITALLY AUTHENTICATED LEGAL RECORD • ELECTRONIC TRANSACTIONS ACT, 2008 (ACT 772)', 62, certBoxY + 6);

    doc
      .font('Times-Roman')
      .fontSize(7.5)
      .fillColor('#57534E')
      .text(
        `Instrument Ref: ${docRef}  •  Execution Date: ${executionDate}  •  Cryptographic Checksum (SHA-256): ${hashVal}`,
        62,
        certBoxY + 18,
        { width: 471 }
      );

    drawFooter(4);

    doc.end();
  });
}

/**
 * Generate official Payment Receipt / Invoice PDF
 * Exact Ghana Transaction Receipt Standard with Akwaaba Homes Watermark & Scannable QR
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
    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const dateObj = new Date(data.paidAt);
    const issueDate = dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const issueTime = dateObj.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const receiptNo = data.reference || `RCP-${data.transactionId.slice(0, 8).toUpperCase()}`;
    const totalPaid = Number(data.grossAmount || 0);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 45;
    const contentWidth = pageWidth - margin * 2;

    // ── Resolve Akwaaba Homes Logo ──
    const possibleLogoPaths = [
      path.resolve(__dirname, '../../assets/logo-light.png'),
      path.resolve(__dirname, '../assets/logo-light.png'),
      path.resolve(process.cwd(), 'assets/logo-light.png'),
      path.resolve(process.cwd(), 'backend/assets/logo-light.png'),
      path.resolve(process.cwd(), '../frontend/public/logo-light.png'),
      path.resolve(process.cwd(), 'frontend/public/logo-light.png'),
      path.resolve(__dirname, '../../../../frontend/public/logo-light.png'),
      path.resolve(__dirname, '../../../frontend/public/logo-light.png'),
    ];
    const logoLightPath = possibleLogoPaths.find((p) => fs.existsSync(p));

    // ── 1. Watermark: Akwaaba Homes Official Logo Emblem (Clearly Visible 0.16 Opacity) ──
    if (logoLightPath) {
      try {
        doc.save();
        doc.opacity(0.16);
        const watermarkSize = 380;
        const wmX = (pageWidth - watermarkSize) / 2;
        const wmY = (pageHeight - watermarkSize) / 2 - 10;
        doc.image(logoLightPath, wmX, wmY, { width: watermarkSize, height: watermarkSize });
        doc.restore();
      } catch (err) {
        // Fallback silently if watermark image encounters unhandled format warning
      }
    }

    // ── 2. Top Solid Brand Green Bar ──
    doc.rect(margin, 40, contentWidth, 8).fill('#16A34A');

    // ── 3. Top Merchant Card ──
    const cardY = 60;
    const cardH = 68;
    doc.roundedRect(margin, cardY, contentWidth, cardH, 8).strokeColor('#E4E4E7').lineWidth(1).stroke();

    if (logoLightPath) {
      try {
        doc.image(logoLightPath, margin + 14, cardY + 12, { fit: [44, 44] });
      } catch (e) {}
    }

    doc
      .fillColor('#09090B')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Akwaaba Homes', margin + 68, cardY + 15);

    doc
      .fillColor('#52525B')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        'Akwaaba Technologies Ltd, Plot 14 Independence Avenue,\nAirport City / West Ridge, Accra, Ghana',
        margin + 68,
        cardY + 34,
        { lineGap: 2 }
      );

    // ── 4. Document Heading ──
    let curY = cardY + cardH + 24;
    doc
      .fillColor('#09090B')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('Transaction receipt', margin, curY);

    curY += 22;
    doc
      .fillColor('#52525B')
      .font('Helvetica')
      .fontSize(9)
      .text('This document serves as a confirmation of your transaction.', margin, curY);

    curY += 22;
    doc
      .fillColor('#09090B')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Purchased Tenancy Transaction', margin, curY);

    curY += 16;
    doc.moveTo(margin, curY).lineTo(margin + contentWidth, curY).strokeColor('#E4E4E7').lineWidth(1).stroke();

    // ── 5. Clean Key-Value Rows ──
    const recipientPhone = data.landlordPhone
      ? data.landlordPhone.replace(/[^0-9]/g, '')
      : '233247124268';
    const recipientName = data.landlordName
      ? data.landlordName.toUpperCase()
      : (data.propertyTitle ? data.propertyTitle.toUpperCase() : 'AKWAABA HOMES');

    const accommodationParts = [
      data.propertyTitle || 'Residential Accommodation',
      data.unitAllocation || null,
      data.roomType || null,
    ].filter(Boolean);
    const accommodationLabel = accommodationParts.join(' • ');

    const paymentMethodLabel = data.paymentMethod
      ? data.paymentMethod.includes('MoMo')
        ? 'MoMo'
        : data.paymentMethod
      : 'MoMo';

    const rows: [string, string][] = [
      ["Sender's Name", data.studentName || 'Tenant'],
      ["Recipient's Number", recipientPhone],
      ["Recipient's Name", recipientName],
      ['Transaction ID', receiptNo],
      ['Amount', `GHS ${totalPaid.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`],
      ['Date', issueDate],
      ['Time', issueTime],
      ['Payment Method', paymentMethodLabel],
      ['Accommodation', accommodationLabel],
    ];

    rows.forEach(([label, value]) => {
      curY += 10;
      doc.fillColor('#52525B').font('Helvetica').fontSize(9.5).text(label, margin + 4, curY);
      doc
        .fillColor('#09090B')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(value, margin + 160, curY, { width: contentWidth - 164, align: 'right' });
      const valH = doc.heightOfString(value, {
        width: contentWidth - 164,
      });
      curY += Math.max(14, valH) + 8;
      doc.moveTo(margin, curY).lineTo(margin + contentWidth, curY).strokeColor('#E4E4E7').lineWidth(1).stroke();
    });

    // ── 6. Bottom QR Code Container ──
    curY += 24;
    const qrBoxH = 140;
    doc.roundedRect(margin, curY, contentWidth, qrBoxH, 10).strokeColor('#E4E4E7').lineWidth(1).stroke();

    doc
      .fillColor('#09090B')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Download The Akwaaba Homes App', margin, curY + 14, {
        width: contentWidth,
        align: 'center',
      });

    doc
      .fillColor('#52525B')
      .font('Helvetica')
      .fontSize(8.5)
      .text('Scan the QR code to verify this transaction on the official Akwaaba Homes portal.', margin, curY + 28, {
        width: contentWidth,
        align: 'center',
      });

    // Draw Vector QR Code
    const verifyUrl = `https://akwaabahomes.com/dashboard/invoice/${data.transactionId}`;
    const qrMatrix = getQRCodeMatrix(verifyUrl);

    const qrSize = 75;
    const qrX = margin + (contentWidth - qrSize) / 2;
    const qrY = curY + 48;

    doc.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8).fill('#FFFFFF');
    doc.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8).strokeColor('#E4E4E7').lineWidth(1).stroke();

    if (qrMatrix.length > 0) {
      const moduleCount = qrMatrix.length;
      const cellSize = qrSize / moduleCount;
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qrMatrix[r][c]) {
            doc.rect(qrX + c * cellSize, qrY + r * cellSize, cellSize, cellSize).fill('#000000');
          }
        }
      }
    }

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

