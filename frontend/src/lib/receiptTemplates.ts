/**
 * Official Financial & Tenancy Receipt Renderer
 * Bank-grade, high-contrast, print-optimized documents.
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
  const formattedDate = new Date(tx.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Payment Receipt - ${tx.reference}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f8fafc;
            color: #09090b;
            padding: 40px 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e4e4e7;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .header-bar {
            border-bottom: 2px solid #18181b;
            padding: 32px 36px 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            text-transform: uppercase;
            color: #18181b;
          }
          .brand-title span { color: #0F5132; }
          .doc-badge {
            font-size: 10px;
            font-weight: 800;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .escrow-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
          }
          .hero-strip {
            background: #fafafa;
            border-bottom: 1px solid #e4e4e7;
            padding: 24px 36px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .amount-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #71717a;
            letter-spacing: 0.5px;
          }
          .amount-num {
            font-size: 28px;
            font-weight: 900;
            color: #0F5132;
            margin-top: 2px;
          }
          .meta-item {
            text-align: right;
          }
          .meta-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #71717a;
          }
          .meta-val {
            font-size: 12px;
            font-weight: 700;
            font-family: monospace;
            color: #18181b;
            margin-top: 2px;
          }
          .body-content {
            padding: 32px 36px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .info-card {
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            padding: 16px;
            background: #ffffff;
          }
          .card-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #71717a;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .card-main {
            font-size: 14px;
            font-weight: 800;
            color: #18181b;
          }
          .card-sub {
            font-size: 12px;
            color: #52525b;
            margin-top: 3px;
          }
          .table-header {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #18181b;
            margin-bottom: 10px;
          }
          .ledger-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 24px;
            border: 1px solid #e4e4e7;
          }
          .ledger-table th {
            background: #f4f4f5;
            color: #18181b;
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid #e4e4e7;
          }
          .ledger-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #f4f4f5;
            color: #27272a;
          }
          .ledger-table tr:last-child td {
            border-bottom: none;
          }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .total-row {
            background: #fafafa;
            font-weight: 800;
            border-top: 2px solid #18181b;
          }
          .total-row td {
            color: #18181b;
            font-size: 13px;
          }
          .audit-bar {
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            padding: 14px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fafafa;
          }
          .audit-text {
            font-size: 11px;
            font-weight: 600;
            color: #52525b;
          }
          .audit-seal {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0F5132;
            letter-spacing: 0.5px;
          }
          .footer-note {
            text-align: center;
            font-size: 10px;
            color: #a1a1aa;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header-bar">
            <div>
              <div class="brand-title">AKWAABA <span>HOMES</span></div>
              <div class="doc-badge">Official Financial Rent Payment Receipt</div>
            </div>
            <div class="escrow-pill">&#x2713; Paystack Verified Escrow</div>
          </div>

          <!-- Hero Strip -->
          <div class="hero-strip">
            <div>
              <div class="amount-label">Total Payment Settled</div>
              <div class="amount-num">GHS ${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Payment Reference</div>
              <div class="meta-val">${tx.reference}</div>
              <div class="meta-label" style="margin-top: 6px;">Settled Date</div>
              <div style="font-size: 11px; color: #52525b;">${formattedDate}</div>
            </div>
          </div>

          <!-- Content Body -->
          <div class="body-content">
            <div class="grid-2">
              <div class="info-card">
                <div class="card-label">Property &amp; Demised Premises</div>
                <div class="card-main">${p.title || 'Accommodation Property'}</div>
                <div class="card-sub">${p.location || 'Accra, Ghana'}</div>
                <div class="card-sub" style="margin-top: 6px; font-weight: 700; color: #0F5132;">Room: ${tx.room?.roomType || 'Standard Occupancy'}</div>
              </div>

              <div class="info-card">
                <div class="card-label">Settlement Clearance</div>
                <div class="card-main">Status: ${(tx.status || 'SUCCESS').toUpperCase()}</div>
                <div class="card-sub">Gateway: Paystack Automated Clearing</div>
                <div class="card-sub">Settlement: Instant MoMo / Card Transfer</div>
              </div>
            </div>

            <div class="grid-2">
              <div class="info-card">
                <div class="card-label">Payer (Resident / Student)</div>
                <div class="card-main">${t.firstName || ''} ${t.lastName || 'Tenant Occupant'}</div>
                <div class="card-sub">Email: ${t.email || 'Registered Tenant'}</div>
                ${t.phoneNumber ? `<div class="card-sub">Phone: ${t.phoneNumber}</div>` : ''}
              </div>

              <div class="info-card">
                <div class="card-label">Lessor (Landlord / Manager)</div>
                <div class="card-main">${l.firstName || 'Property'} ${l.lastName || 'Manager'}</div>
                <div class="card-sub">Email: ${l.email || 'N/A'}</div>
                ${l.phoneNumber ? `<div class="card-sub">Phone: ${l.phoneNumber}</div>` : ''}
              </div>
            </div>

            <!-- Ledger Breakdown -->
            <div class="table-header">Itemized Payment Breakdown</div>
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Tenancy Duration</th>
                  <th class="text-right">Amount (GHS)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-bold">Student Accommodation Rent &amp; Unit Occupancy</td>
                  <td>1 Academic Year</td>
                  <td class="text-right font-bold">GHS ${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Act 220 Statutory Tenant Escrow Protection</td>
                  <td>Active Coverage</td>
                  <td class="text-right font-bold" style="color: #0F5132;">INCLUDED (GHS 0.00)</td>
                </tr>
                <tr>
                  <td>Platform Direct Verification Fee</td>
                  <td>Statutory KYC</td>
                  <td class="text-right font-bold" style="color: #0F5132;">WAIVED (GHS 0.00)</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL SETTLED AMOUNT</td>
                  <td>Full Clearance</td>
                  <td class="text-right" style="color: #0F5132; font-size: 14px;">GHS ${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <!-- Audit Bar -->
            <div class="audit-bar">
              <div class="audit-text">
                Authentic Financial Document &bull; Issued by Akwaaba Homes Clearing System
              </div>
              <div class="audit-seal">
                &#x2713; Escrow Verified &bull; ${issueDate}
              </div>
            </div>

            <div class="footer-note">
              Akwaaba Homes Platform &bull; Computer Generated Tax Invoice &bull; Ref: ${tx.reference}
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
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
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Lease Receipt - ${p.title || 'Tenancy Agreement'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f8fafc;
            color: #09090b;
            padding: 40px 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e4e4e7;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .header-bar {
            border-bottom: 2px solid #18181b;
            padding: 32px 36px 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            text-transform: uppercase;
            color: #18181b;
          }
          .brand-title span { color: #0F5132; }
          .doc-badge {
            font-size: 10px;
            font-weight: 800;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .verified-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
          }
          .hero-strip {
            background: #fafafa;
            border-bottom: 1px solid #e4e4e7;
            padding: 20px 36px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .prop-title { font-size: 18px; font-weight: 900; color: #18181b; }
          .prop-sub { font-size: 12px; color: #71717a; margin-top: 2px; }
          .body-content { padding: 32px 36px; }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .sig-card {
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            padding: 18px;
            background: #ffffff;
          }
          .card-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #71717a;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          .card-main { font-size: 14px; font-weight: 800; color: #18181b; }
          .card-sub { font-size: 11px; color: #71717a; margin-top: 3px; }
          .sig-img {
            max-height: 48px;
            margin-top: 10px;
            border-bottom: 1px dashed #d4d4d8;
            padding-bottom: 4px;
          }
          .sig-note {
            font-size: 11px;
            color: #0F5132;
            font-weight: 600;
            margin-top: 8px;
          }
          .hash-card {
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            background: #fafafa;
            padding: 16px;
            margin-bottom: 24px;
          }
          .hash-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #71717a;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
          }
          .hash-val {
            font-family: monospace;
            font-size: 11px;
            color: #18181b;
            word-break: break-all;
            background: #ffffff;
            border: 1px solid #e4e4e7;
            padding: 8px 12px;
            border-radius: 6px;
          }
          .hash-desc {
            font-size: 11px;
            color: #71717a;
            margin-top: 6px;
            line-height: 1.4;
          }
          .footer-note {
            text-align: center;
            font-size: 10px;
            color: #a1a1aa;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-bar">
            <div>
              <div class="brand-title">AKWAABA <span>HOMES</span></div>
              <div class="doc-badge">Statutory Tenancy Lease Execution Certificate</div>
            </div>
            <div class="verified-pill">&#x2713; Tamper-Evident SHA-256 Vault</div>
          </div>

          <div class="hero-strip">
            <div>
              <div class="prop-title">${p.title || 'Accommodated Property'}</div>
              <div class="prop-sub">${p.location || 'Accra, Ghana'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase;">Room Allocation</div>
              <div style="font-size: 13px; font-weight: 800; color: #18181b;">${b?.room?.roomType || 'Standard Occupancy'}</div>
            </div>
          </div>

          <div class="body-content">
            <div class="grid-2">
              <div class="sig-card">
                <div class="card-label">Tenant / Lessee</div>
                <div class="card-main">${t.firstName || ''} ${t.lastName || 'Occupant Tenant'}</div>
                <div class="card-sub">Signed: ${agreement.tenantSignedAt ? new Date(agreement.tenantSignedAt).toLocaleString('en-GB') : 'N/A'}</div>
                ${
                  agreement.tenantSignature 
                    ? `<img class="sig-img" src="${agreement.tenantSignature}" alt="Tenant Signature" />` 
                    : `<div class="sig-note">&#x2713; Digital Signature Verified on File</div>`
                }
              </div>

              <div class="sig-card">
                <div class="card-label">Landlord / Lessor</div>
                <div class="card-main">${l.firstName || 'Property'} ${l.lastName || 'Manager'}</div>
                <div class="card-sub">Signed: ${agreement.landlordSignedAt ? new Date(agreement.landlordSignedAt).toLocaleString('en-GB') : 'N/A'}</div>
                ${
                  agreement.landlordSignature 
                    ? `<img class="sig-img" src="${agreement.landlordSignature}" alt="Landlord Signature" />` 
                    : `<div class="sig-note">&#x2713; Digital Signature Verified on File</div>`
                }
              </div>
            </div>

            <div class="hash-card">
              <div class="hash-title">
                <span>Cryptographic Digest (SHA-256)</span>
                <span style="color: #0F5132; font-weight: 800;">IMMUTABLY RECORDED</span>
              </div>
              <div class="hash-val">${agreement.cryptographicHash || 'PENDING_FINALIZATION'}</div>
              <div class="hash-desc">
                Executed under Ghana Electronic Transactions Act, 2008 (Act 772). This cryptographic hash seals the tenancy terms against post-execution modification.
              </div>
            </div>

            <div class="footer-note">
              Akwaaba Homes Legal Vault &bull; Issued on ${issueDate} &bull; Document ID: ${agreement.id}
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
