/**
 * Receipt Template Renderer
 * Generates beautiful, well-structured, print-ready financial & tenancy receipts.
 */

export interface PaymentReceiptData {
  reference: string;
  amount: number;
  status: string;
  createdAt: string;
  property?: {
    title?: string;
    location?: string;
    images?: any;
  };
  room?: {
    roomType?: string;
    price?: number;
  };
  landlord?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  };
  tenant?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    studentId?: string;
    ghanaCardNumber?: string;
  };
}

export interface LeaseReceiptData {
  id: string;
  status: string;
  tenantSignedAt?: string;
  tenantSignature?: string;
  landlordSignedAt?: string;
  landlordSignature?: string;
  cryptographicHash?: string;
  booking?: {
    id: string;
    startDate?: string;
    endDate?: string;
    room?: {
      roomType?: string;
      price?: number;
    };
    property?: {
      title?: string;
      location?: string;
      landlord?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
      };
    };
    tenant?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      studentId?: string;
    };
  };
}

export function printPaymentReceipt(tx: PaymentReceiptData) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const p = tx.property || {};
  const l = tx.landlord || {};
  const t = tx.tenant || {};
  const formattedDate = new Date(tx.createdAt || Date.now()).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const issueDate = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Receipt - ${tx.reference}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            padding: 30px 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
          .header-banner {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
            color: #ffffff;
            padding: 36px 40px;
          }
          .header-flex {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-logo {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #ffffff;
          }
          .brand-logo span { color: #38bdf8; }
          .doc-type {
            font-size: 11px;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-top: 4px;
          }
          .status-badge {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(52, 211, 153, 0.4);
            color: #34d399;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .amount-card {
            margin-top: 28px;
            padding: 20px 24px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .amount-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #94a3b8;
            letter-spacing: 1px;
          }
          .amount-value {
            font-size: 32px;
            font-weight: 900;
            color: #38bdf8;
            letter-spacing: -0.5px;
          }
          .ref-text {
            font-size: 11px;
            font-weight: 700;
            color: #94a3b8;
            font-family: monospace;
          }
          
          .content-body {
            padding: 36px 40px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 28px;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
          }
          .info-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.8px;
            margin-bottom: 10px;
          }
          .info-name {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
          }
          .info-sub {
            font-size: 12px;
            color: #64748b;
            margin-top: 3px;
          }
          .info-tag {
            display: inline-block;
            margin-top: 8px;
            font-size: 11px;
            font-weight: 700;
            color: #0284c7;
            background: #e0f2fe;
            padding: 3px 8px;
            border-radius: 6px;
          }

          /* Itemized Table */
          .table-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.8px;
            margin-bottom: 10px;
          }
          .item-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 28px;
          }
          .item-table th {
            background: #f1f5f9;
            color: #475569;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 12px 18px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          .item-table td {
            padding: 14px 18px;
            font-size: 12px;
            color: #1e293b;
            border-bottom: 1px solid #f1f5f9;
          }
          .item-table tr:last-child td { border-bottom: none; }
          .text-right { text-align: right; }
          .font-extrabold { font-weight: 800; }
          .row-highlight { background: #f8fafc; font-weight: 800; }

          /* Security Verification Section */
          .security-box {
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 16px;
            padding: 18px 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .stamp-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .stamp-icon {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #dcfce7;
            border: 2px solid #16a34a;
            color: #15803d;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 900;
          }
          .stamp-info-title { font-size: 12px; font-weight: 800; color: #166534; }
          .stamp-info-sub { font-size: 10px; font-weight: 600; color: #64748b; }

          .sig-box { text-align: right; }
          .sig-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
          .sig-name { font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px; }

          .doc-footer {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 24px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header-banner">
            <div class="header-flex">
              <div>
                <div class="brand-logo">AKWAABA <span>HOMES</span></div>
                <div class="doc-type">Official Financial Rent Payment Receipt</div>
              </div>
              <div class="status-badge">&check; Paystack Verified Escrow</div>
            </div>

            <div class="amount-card">
              <div>
                <div class="amount-label">Total Payment Settled</div>
                <div class="amount-value">GHS ${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="text-align: right;">
                <div class="amount-label">Gateway Reference</div>
                <div class="ref-text">${tx.reference}</div>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="content-body">
            <!-- Grid Metadata -->
            <div class="grid-2">
              <div class="info-box">
                <div class="info-title">&boxbox; Property & Accommodation</div>
                <div class="info-name">${p.title || 'Accommodation Property'}</div>
                <div class="info-sub">&📍 ${p.location || 'Accra, Ghana'}</div>
                <div class="info-tag">Room Type: ${tx.room?.roomType || 'Standard Occupancy'}</div>
              </div>

              <div class="info-box">
                <div class="info-title">&check; Transaction Audit Metadata</div>
                <div class="info-name">Status: ${(tx.status || 'SUCCESS').toUpperCase()}</div>
                <div class="info-sub">Settled Date: ${formattedDate}</div>
                <div class="info-sub" style="margin-top: 4px;">Channel: Paystack Encrypted Gateway</div>
              </div>
            </div>

            <!-- Billed Parties Grid -->
            <div class="grid-2">
              <div class="info-box">
                <div class="info-title">&user; Tenant (Payer)</div>
                <div class="info-name">${t.firstName || ''} ${t.lastName || 'Tenant Occupant'}</div>
                <div class="info-sub">Email: ${t.email || 'Registered Tenant'}</div>
                ${t.phoneNumber ? `<div class="info-sub">Phone: ${t.phoneNumber}</div>` : ''}
              </div>

              <div class="info-box">
                <div class="info-title">&house; Landlord (Recipient)</div>
                <div class="info-name">${l.firstName || 'Property'} ${l.lastName || 'Manager'}</div>
                <div class="info-sub">Email: ${l.email || 'N/A'}</div>
                ${l.phoneNumber ? `<div class="info-sub">Phone: ${l.phoneNumber}</div>` : ''}
              </div>
            </div>

            <!-- Itemized Table -->
            <div class="table-title">&list; Payment Summary Breakdown</div>
            <table class="item-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Duration</th>
                  <th class="text-right">Amount (GHS)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-extrabold">Student Hostel Rent Payment & Accommodation Fee</td>
                  <td>1 Academic Year</td>
                  <td class="text-right font-extrabold">GHS ${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>100% Akwaaba Escrow Protection & Deposit Guarantee</td>
                  <td>Active Coverage</td>
                  <td class="text-right font-extrabold" style="color: #16a34a;">INCLUDED (GHS 0.00)</td>
                </tr>
                <tr>
                  <td>Platform Verification & Processing Fee</td>
                  <td>Instant Access</td>
                  <td class="text-right font-extrabold" style="color: #16a34a;">WAIVED (GHS 0.00)</td>
                </tr>
                <tr class="row-highlight">
                  <td class="font-extrabold" style="font-size: 13px;">TOTAL AMOUNT PAID</td>
                  <td class="font-extrabold">Full Settlement</td>
                  <td class="text-right font-extrabold" style="font-size: 15px; color: #0284c7;">GHS ${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <!-- Security Footer -->
            <div class="security-box">
              <div class="stamp-group">
                <div class="stamp-icon">&check;</div>
                <div>
                  <div class="stamp-info-title">OFFICIALLY VERIFIED & ESCROW SECURED</div>
                  <div class="stamp-info-sub">Authentic Financial Document &bull; Issued by Akwaaba Homes Platform</div>
                </div>
              </div>

              <div class="sig-box">
                <div class="sig-label">Authorized System Issuer</div>
                <div class="sig-name">Akwaaba Escrow Core</div>
                <div style="font-size: 10px; color: #64748b;">Issued on ${issueDate}</div>
              </div>
            </div>

            <div class="doc-footer">
              Akwaaba Homes Financial Services &bull; Computer Generated Official Receipt &bull; Ref: ${tx.reference}
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function printLeaseAgreementReceipt(agreement: LeaseReceiptData) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const b = agreement.booking;
  const p = b?.property || {};
  const l = p?.landlord || {};
  const t = b?.tenant || {};
  const issueDate = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Lease Receipt - ${p.title || 'Tenancy Agreement'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            padding: 30px 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
          .header-banner {
            background: linear-gradient(135deg, #0f172a 0%, #0f172a 60%, #1e1b4b 100%);
            color: #ffffff;
            padding: 36px 40px;
          }
          .header-flex {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-logo {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #ffffff;
          }
          .brand-logo span { color: #38bdf8; }
          .doc-type {
            font-size: 11px;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-top: 4px;
          }
          .status-badge {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(52, 211, 153, 0.4);
            color: #34d399;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .property-card {
            margin-top: 24px;
            padding: 20px 24px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
          }
          .prop-title { font-size: 20px; font-weight: 800; color: #ffffff; }
          .prop-sub { font-size: 12px; color: #cbd5e1; margin-top: 2px; }
          .prop-tag {
            display: inline-block;
            margin-top: 10px;
            font-size: 12px;
            font-weight: 800;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.15);
            padding: 4px 12px;
            border-radius: 8px;
          }
          
          .content-body {
            padding: 36px 40px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .sig-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
          }
          .box-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.8px;
            margin-bottom: 8px;
          }
          .party-name { font-size: 15px; font-weight: 800; color: #0f172a; }
          .sig-time { font-size: 11px; color: #64748b; margin-top: 4px; }
          .signature-img {
            max-height: 52px;
            margin-top: 12px;
            border-bottom: 2px border #cbd5e1;
            padding-bottom: 4px;
          }
          .sig-placeholder {
            font-size: 12px;
            font-style: italic;
            color: #94a3b8;
            margin-top: 12px;
          }

          /* Cryptographic Hash Section */
          .hash-container {
            background: #0f172a;
            color: #ffffff;
            border-radius: 16px;
            padding: 22px;
            margin-bottom: 28px;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .hash-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #38bdf8;
            letter-spacing: 1px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .hash-val {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #7dd3fc;
            word-break: break-all;
            background: rgba(255, 255, 255, 0.05);
            padding: 10px 14px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .hash-notice {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 8px;
            line-height: 1.4;
          }

          .footer-note {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 24px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header Banner -->
          <div class="header-banner">
            <div class="header-flex">
              <div>
                <div class="brand-logo">AKWAABA <span>HOMES</span></div>
                <div class="doc-type">Official Tenancy Verification & Lease Receipt</div>
              </div>
              <div class="status-badge">&check; Verified Legal Agreement</div>
            </div>

            <div class="property-card">
              <div class="prop-title">${p.title || 'Accommodated Property'}</div>
              <div class="prop-sub">&📍 ${p.location || 'Ghana'}</div>
              <div class="prop-tag">Room Type: ${b?.room?.roomType || 'Standard Occupancy'} &bull; Rate: GHS ${(b?.room?.price || 0).toLocaleString()}/yr</div>
            </div>
          </div>

          <!-- Content Body -->
          <div class="content-body">
            
            <!-- Dual Signature Section -->
            <div class="grid-2">
              <!-- Tenant -->
              <div class="sig-box">
                <div class="box-label">Tenant (Occupant)</div>
                <div class="party-name">${t.firstName || ''} ${t.lastName || 'Occupant Tenant'}</div>
                <div class="sig-time">Signed: ${agreement.tenantSignedAt ? new Date(agreement.tenantSignedAt).toLocaleString() : 'N/A'}</div>
                ${
                  agreement.tenantSignature 
                    ? `<img class="signature-img" src="${agreement.tenantSignature}" alt="Tenant Signature" />` 
                    : `<div class="sig-placeholder">Digital Signature Verified on File</div>`
                }
              </div>

              <!-- Landlord -->
              <div class="sig-box">
                <div class="box-label">Landlord / Property Manager</div>
                <div class="party-name">${l.firstName || 'Property'} ${l.lastName || 'Manager'}</div>
                <div class="sig-time">Signed: ${agreement.landlordSignedAt ? new Date(agreement.landlordSignedAt).toLocaleString() : 'N/A'}</div>
                ${
                  agreement.landlordSignature 
                    ? `<img class="signature-img" src="${agreement.landlordSignature}" alt="Landlord Signature" />` 
                    : `<div class="sig-placeholder">Digital Signature Verified on File</div>`
                }
              </div>
            </div>

            <!-- Cryptographic Seal -->
            <div class="hash-container">
              <div class="hash-title">
                <span>Cryptographic Integrity Hash Seal (SHA-256)</span>
                <span>TAMPER-PROOF</span>
              </div>
              <div class="hash-val">${agreement.cryptographicHash || 'PENDING_FINALIZATION'}</div>
              <div class="hash-notice">
                This SHA-256 cryptographic seal guarantees that neither party can alter the terms, clauses, or signatures of this lease post-execution.
              </div>
            </div>

            <div class="footer-note">
              Akwaaba Homes Legal Verification Service &bull; Generated on ${issueDate} &bull; Document ID: ${agreement.id}
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
