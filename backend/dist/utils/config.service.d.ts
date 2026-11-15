export declare const getSystemConfig: () => Promise<any>;
export type SubscriptionPropertyCategory = 'Studio' | 'Apartment' | 'House' | 'Hostel';
export declare function normalizeSubscriptionCategory(propertyType?: string | null): SubscriptionPropertyCategory;
export declare function resolveSubscriptionFeeForType(propertyType?: string | null, existingConfig?: any): Promise<{
    category: SubscriptionPropertyCategory;
    feeGhs: number;
    feeSchedule: Record<SubscriptionPropertyCategory, number>;
}>;
export declare const invalidateConfigCache: () => void;
//# sourceMappingURL=config.service.d.ts.map