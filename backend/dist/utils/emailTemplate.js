"use strict";
/**
 * AkwaabaHomes Production Email Templating Engine
 * Designed to a modern, restrained Ghanaian PropTech aesthetic.
 * Clean typography, warm ivory canvas, cross-client safe (Gmail, Apple Mail, Outlook, Mobile).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderInstitutionalEmail = exports.CLOUDINARY_EMAIL_ASSETS = exports.emailMetaTableHtml = exports.emailCardHtml = exports.emailButtonHtml = exports.emailBadgeHtml = void 0;
const emailBadgeHtml = (badge) => {
    const styles = {
        emerald: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
        gold: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
        slate: { bg: '#F4F4F5', text: '#3F3F46', border: '#E4E4E7' },
        rose: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
        blue: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
    };
    const current = styles[badge.variant || 'slate'];
    return `<span style="display:inline-block;padding:3px 8px;margin:2px 4px 2px 0;background:${current.bg};color:${current.text};border:1px solid ${current.border};border-radius:5px;font-size:11px;font-weight:600;letter-spacing:0.2px;">${badge.label}: ${badge.value}</span>`;
};
exports.emailBadgeHtml = emailBadgeHtml;
const emailButtonHtml = (action) => {
    const styles = {
        primary: { bg: '#16A34A', text: '#FFFFFF', hoverBg: '#15803D' },
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
exports.emailButtonHtml = emailButtonHtml;
const emailCardHtml = (contentHtml, title) => `
  <div style="background-color:#FAFAFA;border:1px solid #E4E4E7;border-radius:8px;padding:16px 20px;margin:20px 0;">
    ${title ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#71717A;margin-bottom:10px;">${title}</div>` : ''}
    ${contentHtml}
  </div>
`;
exports.emailCardHtml = emailCardHtml;
const emailMetaTableHtml = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    ${rows
    .map((r, i) => `
      <tr style="border-bottom:${i === rows.length - 1 ? 'none' : '1px solid #F4F4F5'};">
        <td style="padding:7px 0;color:#71717A;font-size:13px;font-weight:500;">${r.label}</td>
        <td style="padding:7px 0;color:${r.highlight ? '#16A34A' : '#18181B'};font-size:13px;font-weight:${r.highlight ? '700' : '600'};text-align:right;${r.isMono ? 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-size:12px;word-break:break-all;' : ''}">${r.value}</td>
      </tr>
    `)
    .join('')}
  </table>
`;
exports.emailMetaTableHtml = emailMetaTableHtml;
exports.CLOUDINARY_EMAIL_ASSETS = {
    logo: 'https://res.cloudinary.com/kmns2bin/image/upload/v1793972099/akwaaba-logo-light.png',
    watermark: 'https://res.cloudinary.com/kmns2bin/image/upload/v1793972153/akwaaba-logo-watermark.png',
};
const renderInstitutionalEmail = ({ title, preheader, categoryTag = 'NOTICE', bodyHtml, footerNote = 'This is an official transactional message sent by AkwaabaHomes for your account records.', watermarkUrl: customWatermarkUrl, logoUrl: customLogoUrl, }) => {
    const currentYear = new Date().getFullYear();
    const logoUrl = customLogoUrl || exports.CLOUDINARY_EMAIL_ASSETS.logo;
    const watermarkUrl = customWatermarkUrl || exports.CLOUDINARY_EMAIL_ASSETS.watermark;
    const upperTag = (categoryTag || '').toUpperCase();
    const categoryTagStyles = {
        SECURITY: { bg: '#EBF7EE', border: '#CDEED5', text: '#16A34A' },
        VERIFICATION: { bg: '#EBF7EE', border: '#CDEED5', text: '#16A34A' },
        PAYOUT: { bg: '#EBF7EE', border: '#CDEED5', text: '#16A34A' },
        BOOKING: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
        NOTICE: { bg: '#F4F4F5', border: '#E4E4E7', text: '#52525B' },
    };
    const activeTagStyle = categoryTagStyles[upperTag] || {
        bg: '#F4F4F5',
        border: '#E4E4E7',
        text: '#52525B',
    };
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
          
          <!-- Editorial Header with Akwaaba Logo Branding -->
          <tr>
            <td style="padding:22px 28px 18px;border-bottom:1px solid #E4E4E7;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:44px;vertical-align:middle;padding-right:12px;">
                    <img src="${logoUrl}" alt="AkwaabaHomes" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:8px;object-fit:contain;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:18px;font-weight:800;color:#18181B;letter-spacing:-0.4px;line-height:1.2;">
                      Akwaaba<span style="color:#16A34A;">Homes</span>
                    </div>
                    <div style="color:#71717A;font-size:11px;font-weight:500;margin-top:2px;letter-spacing:0.2px;">
                      Ghana Accommodation &amp; Tenancy Network
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="background-color:${activeTagStyle.bg};border:1px solid ${activeTagStyle.border};color:${activeTagStyle.text};padding:4px 9px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;display:inline-block;">
                      ${categoryTag}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Editorial Body with Akwaaba Logo Watermark -->
          <tr>
            <td background="${watermarkUrl}" style="padding:28px 28px 32px;background-color:#FFFFFF;background-image:url('${watermarkUrl}');background-repeat:no-repeat;background-position:center center;background-size:280px 280px;position:relative;">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:504px;">
                <v:fill type="frame" src="${watermarkUrl}" color="#FFFFFF" />
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              
              <!-- Watermark Authenticity Pill -->
              <div style="text-align:center;margin:0 auto 20px auto;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;background-color:#F4F8F5;border:1px solid #D1E5D9;border-radius:20px;padding:4px 12px 4px 6px;">
                  <tr>
                    <td style="vertical-align:middle;padding-right:6px;">
                      <img src="${logoUrl}" alt="Akwaaba Homes" width="18" height="18" style="display:block;width:18px;height:18px;object-fit:contain;" />
                    </td>
                    <td style="vertical-align:middle;font-size:10px;font-weight:700;color:#16A34A;letter-spacing:0.3px;text-transform:uppercase;">
                      Verified AkwaabaHomes Notice
                    </td>
                  </tr>
                </table>
              </div>

              <div style="position:relative;z-index:2;">
                ${bodyHtml}
              </div>
              <!--[if gte mso 9]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <!-- Professional Footer with Authenticity Badge -->
          <tr>
            <td style="background-color:#FAFAFA;border-top:1px solid #E4E4E7;padding:22px 28px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 10px auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:6px;">
                    <img src="${logoUrl}" alt="AkwaabaHomes" width="16" height="16" style="display:block;width:16px;height:16px;opacity:0.75;" />
                  </td>
                  <td style="vertical-align:middle;font-size:11px;font-weight:700;color:#52525B;letter-spacing:0.3px;text-transform:uppercase;">
                    Official AkwaabaHomes Communication
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px;color:#71717A;font-size:11px;line-height:1.5;">
                ${footerNote}
              </p>
              <div style="border-top:1px solid #E4E4E7;margin:12px 0 10px;padding-top:10px;color:#A1A1AA;font-size:10px;line-height:1.5;">
                &copy; ${currentYear} Akwaaba Homes Ghana Ltd. Regulated under Ghana Data Protection Act, 2012 (Act 843).<br />
                Accra Central &amp; Kumasi Hubs · For assistance, contact <a href="mailto:support@akwaabahomes.com" style="color:#16A34A;text-decoration:none;font-weight:600;">support@akwaabahomes.com</a>.
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
exports.renderInstitutionalEmail = renderInstitutionalEmail;
//# sourceMappingURL=emailTemplate.js.map