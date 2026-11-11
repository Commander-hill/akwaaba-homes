export interface RegisteredQueryClient {
  invalidateQueries: (filters?: { queryKey?: unknown[]; refetchType?: 'active' | 'inactive' | 'all' | 'none' }) => Promise<void> | void;
  setQueryData: (queryKey: unknown[], data: unknown) => unknown;
  clear: () => void;
}

let registeredClient: RegisteredQueryClient | null = null;

export function registerQueryClient(client: RegisteredQueryClient | null) {
  registeredClient = client;
}

export function getRegisteredQueryClient(): RegisteredQueryClient | null {
  return registeredClient;
}
