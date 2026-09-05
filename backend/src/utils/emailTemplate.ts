/**
 * Akwaaba Homes Institutional Email Templating Engine
 * Designed to Ghanaian Forest Emerald (#0F5132) & Heritage Gold (#D97706) aesthetic.
 * Fully responsive, cross-client safe (Gmail, Apple Mail, Outlook, Mobile).
 */

export interface EmailBadge {
  label: string;
  value: string;
  variant?: 'emerald' | 'gold' | 'slate' | 'rose' | 'blue';
}

export interface EmailAction {
  label: string;
  url: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
}

export interface EmailMetaRow {
  label: string;
  value: string;
  isMono?: boolean;
  highlight?: boolean;
}

export const emailBadgeHtml = (badge: EmailBadge): string => {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    gold: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
    slate: { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
    rose: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    blue: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  };

  const current = styles[badge.variant || 'slate'];
  return `<span style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;background:${current.bg};color:${current.text};border:1px solid ${current.border};border-radius:6px;font-size:12px;font-weight:700;letter-spacing:0.3px;">${badge.label}: ${badge.value}</span>`;
};

export const emailButtonHtml = (action: EmailAction): string => {
  const styles: Record<string, { bg: string; text: string; shadow: string }> = {
    primary: { bg: '#0F5132', text: '#FFFFFF', shadow: '0 4px 12px rgba(15,81,50,0.25)' },
    accent: { bg: '#D97706', text: '#FFFFFF', shadow: '0 4px 12px rgba(217,119,6,0.25)' },
    secondary: { bg: '#1E293B', text: '#FFFFFF', shadow: '0 4px 12px rgba(30,41,59,0.2)' },
    danger: { bg: '#DC2626', text: '#FFFFFF', shadow: '0 4px 12px rgba(220,38,38,0.25)' },
  };

  const current = styles[action.variant || 'primary'];
  return `
    <div style="text-align:center;margin:32px 0 24px;">
      <a href="${action.url}" style="background-color:${current.bg};color:${current.text};padding:14px 34px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;box-shadow:${current.shadow};letter-spacing:0.3px;">
        ${action.label} &rarr;
      </a>
    </div>
  `;
};

export const emailCardHtml = (contentHtml: string, title?: string): string => `
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:22px;margin:24px 0;">
    ${title ? `<h4 style="margin:0 0 14px;color:#0F172A;font-size:14px;text-transform:uppercase;letter-spacing:1px;font-weight:800;">${title}</h4>` : ''}
    ${contentHtml}
  </div>
`;

export const emailMetaTableHtml = (rows: EmailMetaRow[]): string => `
  <table style="width:100%;border-collapse:collapse;margin:6px 0;">
    ${rows
      .map(
        (r, i) => `
      <tr style="border-bottom:${i === rows.length - 1 ? 'none' : '1px solid #E2E8F0'};">
        <td style="padding:10px 0;color:#64748B;font-size:13px;font-weight:500;">${r.label}</td>
        <td style="padding:10px 0;color:${r.highlight ? '#0F5132' : '#0F172A'};font-size:14px;font-weight:${r.highlight ? '800' : '600'};text-align:right;${r.isMono ? 'font-family:ui-monospace,Menlo,monospace;word-break:break-all;' : ''}">${r.value}</td>
      </tr>
    `
      )
      .join('')}
  </table>
`;

export interface RenderEmailOptions {
  title: string;
  preheader: string;
  categoryTag?: string;
  bodyHtml: string;
  footerNote?: string;
}

export const renderInstitutionalEmail = ({
  title,
  preheader,
  categoryTag = 'OFFICIAL NOTICE',
  bodyHtml,
  footerNote = 'This is an authentic, legally valid transactional transmission dispatched by the Akwaaba Homes Housing Platform. Under the Ghana Rent Act, 1963 (Act 220) and Electronic Transactions Act, 2008 (Act 772), this record is archived for tenancy compliance.',
}: RenderEmailOptions): string => {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:#1E293B;">
  <span style="display:none;font-size:1px;color:#F1F5F9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);border:1px solid #E2E8F0;">
          
          <!-- Institutional Header -->
          <tr>
            <td style="background:#0F5132;padding:32px 36px;text-align:left;border-bottom:3px solid #D97706;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.2;">
                      Akwaaba<span style="color:#F59E0B;">Homes</span>
                    </div>
                    <div style="color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-top:4px;">
                      Ghana National Housing & Tenancy Escrow
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#FFFFFF;padding:5px 12px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;display:inline-block;">
                      ${categoryTag}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Editorial Body -->
          <tr>
            <td style="padding:40px 36px;background-color:#FFFFFF;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Statutory Compliance Footer -->
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:28px 36px;text-align:center;">
              <div style="margin-bottom:14px;">
                <span style="display:inline-block;padding:4px 10px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;color:#065F46;font-size:11px;font-weight:700;letter-spacing:0.5px;">
                  🛡️ RENT ACT, 1963 (ACT 220) COMPLIANT
                </span>
                <span style="display:inline-block;padding:4px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;color:#92400E;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-left:4px;">
                  🏛️ LANDS COMMISSION VERIFIED
                </span>
              </div>
              <p style="margin:0 0 10px;color:#64748B;font-size:12px;line-height:1.6;">
                ${footerNote}
              </p>
              <div style="border-top:1px solid #E2E8F0;margin:16px 0 12px;padding-top:14px;color:#94A3B8;font-size:11px;line-height:1.5;">
                &copy; ${currentYear} Akwaaba Homes Ghana Ltd. All rights reserved.<br />
                Accra Central Financial District, Greater Accra Region, Ghana.<br />
                For statutory inquiries or dispute assistance, contact <a href="mailto:support@akwaabahomes.com" style="color:#0F5132;text-decoration:none;font-weight:600;">support@akwaabahomes.com</a>.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
