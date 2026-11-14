export declare const getVapidPublicKey: () => string;
export declare const saveSubscription: (userId: string, subscription: {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}) => Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}>;
export declare const removeSubscription: (endpoint: string) => Promise<import("@prisma/client/runtime/library").GetBatchResult>;
export declare const sendPushToUser: (userId: string, payload: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
}) => Promise<void>;
//# sourceMappingURL=push.service.d.ts.map