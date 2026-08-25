export declare const getVapidPublicKey: () => string;
export declare const saveSubscription: (userId: string, subscription: {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}) => Promise<{
    id: string;
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    createdAt: Date;
}>;
export declare const removeSubscription: (endpoint: string) => Promise<import(".prisma/client").Prisma.BatchPayload>;
export declare const sendPushToUser: (userId: string, payload: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
}) => Promise<void>;
//# sourceMappingURL=push.service.d.ts.map