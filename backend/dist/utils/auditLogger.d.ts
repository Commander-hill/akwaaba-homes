/**
 * Recursively redacts and masks sensitive fields & Act 843 National ID PII from audit logs.
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
    userId: string;
    ipAddress: string | null;
    action: string;
    entity: string;
    entityId: string;
    oldData: string | null;
    newData: string | null;
}>;
//# sourceMappingURL=auditLogger.d.ts.map