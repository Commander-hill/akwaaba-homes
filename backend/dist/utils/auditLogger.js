"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = exports.redactSensitiveData = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const socket_1 = require("../socket");
const SENSITIVE_KEY_REGEX = /password|hash|token|secret|recoverycode|cvv|authorization|cookie|cardnumber/i;
/**
 * Recursively redacts sensitive fields from audit log payloads to prevent credential leakage.
 */
const redactSensitiveData = (data) => {
    if (!data)
        return data;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (typeof parsed === 'object' && parsed !== null) {
                return JSON.stringify((0, exports.redactSensitiveData)(parsed));
            }
        }
        catch {
            // Plain string
        }
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => (0, exports.redactSensitiveData)(item));
    }
    if (typeof data === 'object') {
        const sanitized = {};
        for (const key of Object.keys(data)) {
            if (SENSITIVE_KEY_REGEX.test(key)) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = (0, exports.redactSensitiveData)(data[key]);
            }
        }
        return sanitized;
    }
    return data;
};
exports.redactSensitiveData = redactSensitiveData;
const logAudit = async (userId, action, entity, entityId, oldData = null, newData = null, ipAddress = 'Unknown') => {
    try {
        const sanitizedOld = oldData ? JSON.stringify((0, exports.redactSensitiveData)(oldData)) : null;
        const sanitizedNew = newData ? JSON.stringify((0, exports.redactSensitiveData)(newData)) : null;
        const log = await prisma_1.default.auditLog.create({
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
        (0, socket_1.emitToAll)('audit_event_logged', log);
        return log;
    }
    catch (error) {
        console.error('Audit Logger Error:', error);
        return null;
    }
};
exports.logAudit = logAudit;
//# sourceMappingURL=auditLogger.js.map