import prisma from './prisma';
import { emitToAll } from '../socket';

// Act 843 (Ghana Data Protection Act) & Security Sensitive Keys
const SENSITIVE_KEY_REGEX = /password|hash|token|secret|recoverycode|cvv|authorization|cookie|cardnumber|pin|cvc/i;
const PII_IDENTITY_KEY_REGEX = /ghanacard|nationalid|idnumber|ssnit|passportphoto|selfieurl|ghanacardfront|ghanacardback/i;
const FINANCIAL_KEY_REGEX = /accountnumber|account_number|momonumber/i;

const GHANA_CARD_REGEX = /GHA-[0-9]{9}-[0-9]/gi;

/**
 * Masks a Ghana Card number for Act 843 compliance (e.g. GHA-712345678-9 -> GHA-*****5678-9)
 */
function maskGhanaCard(val: string): string {
  return val.replace(GHANA_CARD_REGEX, (match) => {
    const parts = match.split('-');
    if (parts.length === 3) {
      const num = parts[1];
      return `GHA-*****${num.slice(-4)}-${parts[2]}`;
    }
    return 'GHA-*****[PROTECTED]';
  });
}

/**
 * Masks financial account numbers (e.g. 0244123456 -> 024****456)
 */
function maskAccountNumber(val: string): string {
  const str = String(val).trim();
  if (str.length <= 4) return '****';
  return `${str.slice(0, 3)}****${str.slice(-3)}`;
}

/**
 * Recursively redacts and masks sensitive fields & Act 843 National ID PII from audit logs.
 */
export const redactSensitiveData = (data: any): any => {
  if (!data) return data;

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null) {
        return JSON.stringify(redactSensitiveData(parsed));
      }
    } catch {
      // Plain string - check for embedded Ghana Card pin
      if (GHANA_CARD_REGEX.test(data)) {
        return maskGhanaCard(data);
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (PII_IDENTITY_KEY_REGEX.test(key)) {
        if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/uploads'))) {
          sanitized[key] = '[ACT_843_SECURE_DOCUMENT_STORED]';
        } else if (typeof val === 'string') {
          sanitized[key] = maskGhanaCard(val);
        } else {
          sanitized[key] = '[PROTECTED_PII]';
        }
      } else if (FINANCIAL_KEY_REGEX.test(key)) {
        sanitized[key] = maskAccountNumber(val);
      } else {
        sanitized[key] = redactSensitiveData(val);
      }
    }
    return sanitized;
  }

  return data;
};

export const logAudit = async (
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  oldData: any = null,
  newData: any = null,
  ipAddress: string = 'Unknown'
) => {
  try {
    const sanitizedOld = oldData ? JSON.stringify(redactSensitiveData(oldData)) : null;
    const sanitizedNew = newData ? JSON.stringify(redactSensitiveData(newData)) : null;

    const log = await prisma.auditLog.create({
      data: {
        user: { connect: { id: userId } },
        action,
        entity,
        entityId: entityId || 'SYSTEM',
        oldData: sanitizedOld,
        newData: sanitizedNew,
        ipAddress: ipAddress ? String(ipAddress).split(',')[0].trim() : 'Unknown'
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } }
      }
    });

    // Real-time broadcast to admin control mesh
    emitToAll('audit_event_logged', log);
    return log;
  } catch (error) {
    console.error('Audit Logger Error:', error);
    return null;
  }
};
