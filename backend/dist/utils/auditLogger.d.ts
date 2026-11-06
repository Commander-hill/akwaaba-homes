/**
 * Recursively redacts sensitive fields from audit log payloads to prevent credential leakage.
 */
export declare const redactSensitiveData: (data: any) => any;
export declare const logAudit: (userId: string, action: string, entity: string, entityId: string, oldData?: any, newData?: any, ipAddress?: string) => Promise<{
    user: {
        email: string;
        role: string;
        firstName: string;
        lastName: string;
    };
} & {
    id: string;
    createdAt: Date;
    action: string;
    entity: string;
    entityId: string;
    oldData: string | null;
    newData: string | null;
    ipAddress: string | null;
    userId: string;
}>;
//# sourceMappingURL=auditLogger.d.ts.map