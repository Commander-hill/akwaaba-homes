/**
 * AkwaabaHomes Production Email Templating Engine
 * Designed to a modern, restrained Ghanaian PropTech aesthetic.
 * Clean typography, warm ivory canvas, cross-client safe (Gmail, Apple Mail, Outlook, Mobile).
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
    slate: { bg: '#F4F4F5', text: '#3F3F46', border: '#E4E4E7' },
    rose: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    blue: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  };

  const current = styles[badge.variant || 'slate'];
  return `<span style="display:inline-block;padding:3px 8px;margin:2px 4px 2px 0;background:${current.bg};color:${current.text};border:1px solid ${current.border};border-radius:5px;font-size:11px;font-weight:600;letter-spacing:0.2px;">${badge.label}: ${badge.value}</span>`;
};

export const emailButtonHtml = (action: EmailAction): string => {
  const styles: Record<string, { bg: string; text: string; hoverBg: string }> = {
    primary: { bg: '#0F5132', text: '#FFFFFF', hoverBg: '#0A3D24' },
    accent: { bg: '#18181B', text: '#FFFFFF', hoverBg: '#27272A' },
    secondary: { bg: '#F4F4F5', text: '#18181B', hoverBg: '#E4E4E7' },
    danger: { bg: '#DC2626', text: '#FFFFFF', hoverBg: '#B91C1C' },
  };

  const current = styles[action.variant || 'primary'];
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:26px auto 18px auto;">
      <tr>
        <td align="center" style="background-color:${current.bg};border-radius:8px;">
          <a href="${action.url}" target="_blank" style="display:inline-block;padding:12px 28px;color:${current.text};font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
            ${action.label}
          </a>
        </td>
      </tr>
    </table>
  `;
};

export const emailCardHtml = (contentHtml: string, title?: string): string => `
  <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-radius:8px;padding:16px 20px;margin:20px 0;">
    ${title ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#71717A;margin-bottom:10px;">${title}</div>` : ''}
    ${contentHtml}
  </div>
`;

export const emailMetaTableHtml = (rows: EmailMetaRow[]): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    ${rows
      .map(
        (r, i) => `
      <tr style="border-bottom:${i === rows.length - 1 ? 'none' : '1px solid #F4F4F5'};">
        <td style="padding:7px 0;color:#71717A;font-size:13px;font-weight:500;">${r.label}</td>
        <td style="padding:7px 0;color:${r.highlight ? '#0F5132' : '#18181B'};font-size:13px;font-weight:${r.highlight ? '700' : '600'};text-align:right;${r.isMono ? 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-size:12px;word-break:break-all;' : ''}">${r.value}</td>
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
  categoryTag = 'NOTICE',
  bodyHtml,
  footerNote = 'This is an official transactional message sent by AkwaabaHomes for your account records.',
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
<body style="margin:0;padding:0;background-color:#F7F7F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:#27272A;">
  <span style="display:none;font-size:1px;color:#F7F7F6;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F7F6;padding:36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid #E4E4E7;">
          
          <!-- Editorial Header -->
          <tr>
            <td style="padding:24px 28px 20px;border-bottom:1px solid #E4E4E7;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:18px;font-weight:800;color:#18181B;letter-spacing:-0.4px;line-height:1.2;">
                      Akwaaba<span style="color:#0F5132;">Homes</span>
                    </div>
                    <div style="color:#71717A;font-size:11px;font-weight:500;margin-top:2px;letter-spacing:0.2px;">
                      Ghana Accommodation &amp; Tenancy Network
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="background-color:#F4F4F5;border:1px solid #E4E4E7;color:#52525B;padding:4px 9px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;display:inline-block;">
                      ${categoryTag}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Editorial Body -->
          <tr>
            <td style="padding:32px 28px;background-color:#FFFFFF;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Professional Footer -->
          <tr>
            <td style="background-color:#FAFAFA;border-top:1px solid #E4E4E7;padding:22px 28px;text-align:center;">
              <div style="font-size:11px;font-weight:600;color:#52525B;margin-bottom:6px;">
                AkwaabaHomes Ghana
              </div>
              <p style="margin:0 0 10px;color:#71717A;font-size:11px;line-height:1.5;">
                ${footerNote}
              </p>
              <div style="border-top:1px solid #E4E4E7;margin:12px 0 10px;padding-top:10px;color:#A1A1AA;font-size:10px;line-height:1.5;">
                &copy; ${currentYear} Akwaaba Homes Ghana Ltd. Regulated under Ghana Data Protection Act, 2012 (Act 843).<br />
                Accra Central &amp; Kumasi Hubs · For assistance, contact <a href="mailto:support@akwaabahomes.com" style="color:#0F5132;text-decoration:none;font-weight:600;">support@akwaabahomes.com</a>.
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
