import prisma from './prisma';

const SENSITIVE_KEY_REGEX = /password|hash|token|secret|recoverycode|cvv|authorization|cookie|cardnumber/i;

/**
 * Recursively redacts sensitive fields from audit log payloads to prevent credential leakage.
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
      // Plain string
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(data[key]);
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

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: userId } },
        action,
        entity,
        entityId: entityId || 'SYSTEM',
        oldData: sanitizedOld,
        newData: sanitizedNew,
        ipAddress: ipAddress ? String(ipAddress).split(',')[0].trim() : 'Unknown'
      }
    });
  } catch (error) {
    console.error('Audit Logger Error:', error);
  }
};
