/**
 * Centralized TanStack Query Key Factory
 * 
 * Strict hierarchical tuple conventions:
 * 1. Root entity namespace (e.g. 'properties', 'bookings', 'auth')
 * 2. Scope qualifier (e.g. 'list', 'detail', 'mine')
 * 3. Granular parameters / IDs (e.g. propertyId, filter object)
 * 
 * Benefits:
 * - Deterministic, typo-free query keys
 * - Invalidation cascades: queryClient.invalidateQueries({ queryKey: queryKeys.properties.all })
 *   clears all lists, details, and landlord property views.
 * - Granular invalidation: queryClient.invalidateQueries({ queryKey: queryKeys.properties.detail(id) })
 *   only revalidates the specified item.
 */

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    session: () => ['session'] as const,
    profile: () => ['auth', 'profile'] as const,
  },

  properties: {
    all: ['properties'] as const,
    lists: () => ['properties', 'list'] as const,
    list: (filters: Record<string, any>) => ['properties', 'list', filters] as const,
    details: () => ['property'] as const,
    detail: (id: string) => ['property', id] as const,
    landlordMine: () => ['properties', 'landlord', 'mine'] as const,
    landlordStats: () => ['landlord', 'stats'] as const,
    featured: () => ['properties', 'featured'] as const,
    landmarks: (propertyId: string) => ['property', propertyId, 'landmarks'] as const,
  },

  bookings: {
    all: ['bookings'] as const,
    landlord: (filters?: Record<string, any>) => ['bookings', 'landlord', filters || {}] as const,
    tenant: () => ['bookings', 'me'] as const,
    myActive: () => ['bookings', 'my-active'] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
  },

  agreements: {
    all: ['agreements'] as const,
    landlord: () => ['agreements', 'landlord'] as const,
    tenant: () => ['agreements', 'tenant'] as const,
    detail: (id: string) => ['agreements', 'detail', id] as const,
  },

  tickets: {
    all: ['tickets'] as const,
    landlord: () => ['tickets', 'landlord'] as const,
    tenant: () => ['tickets', 'tenant'] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
  },

  subscriptions: {
    all: ['subscriptions'] as const,
    overview: () => ['subscriptions', 'overview'] as const,
    plans: () => ['subscriptions', 'plans'] as const,
    history: () => ['subscriptions', 'history'] as const,
  },

  transactions: {
    all: ['transactions'] as const,
    landlordReport: () => ['transactions', 'landlord', 'report'] as const,
    financialLedger: () => ['financialLedger'] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },

  wishlist: {
    all: ['wishlist'] as const,
    user: () => ['wishlist'] as const,
  },

  staff: {
    all: ['staff'] as const,
    landlord: () => ['staff', 'landlord'] as const,
  }
} as const;
