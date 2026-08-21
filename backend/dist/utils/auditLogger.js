"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const logAudit = async (userId, action, entity, entityId, oldData = null, newData = null, ipAddress = 'Unknown') => {
    try {
        await prisma_1.default.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                oldData: oldData ? JSON.stringify(oldData) : null,
                newData: newData ? JSON.stringify(newData) : null,
                ipAddress
            }
        });
    }
    catch (error) {
        console.error('Audit Logger Error:', error);
        // In production, we should probably write to a flat file if the DB fails to ensure the trail isn't lost.
    }
};
exports.logAudit = logAudit;
//# sourceMappingURL=auditLogger.js.map