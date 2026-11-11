import { useEffect, useState } from 'react';

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal && envUrl.includes('localhost')) {
      return envUrl.replace('localhost', window.location.hostname).replace(/\/$/, '');
    }
  }
  return envUrl.replace(/\/$/, '');
};

export async function publicGet<T = any>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal
): Promise<T> {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${base}${normalizedPath}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        qs.set(k, String(v));
      }
    }
    const query = qs.toString();
    if (query) url += `?${query}`;
  }
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function publicPost<T = any>(path: string, body?: unknown): Promise<T | null> {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${base}${normalizedPath}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

interface ResourceEntry<T = any> {
  data: T | undefined;
  updatedAt: number;
  promise: Promise<T> | null;
  fetcher?: () => Promise<T>;
  listeners: Set<(val: T | undefined) => void>;
}

const resourceStore = new Map<string, ResourceEntry>();

function getOrCreateEntry<T>(key: string, fetcher?: () => Promise<T>): ResourceEntry<T> {
  let entry = resourceStore.get(key) as ResourceEntry<T> | undefined;
  if (!entry) {
    entry = { data: undefined, updatedAt: 0, promise: null, fetcher, listeners: new Set() };
    resourceStore.set(key, entry);
  } else if (fetcher) {
    entry.fetcher = fetcher;
  }
  return entry;
}

async function runFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T | undefined> {
  const entry = getOrCreateEntry<T>(key, fetcher);
  if (entry.promise) return entry.promise;
  entry.promise = fetcher()
    .then((res) => {
      entry.data = res;
      entry.updatedAt = Date.now();
      entry.promise = null;
      entry.listeners.forEach((cb) => cb(res));
      return res;
    })
    .catch((err) => {
      entry.promise = null;
      throw err;
    });
  return entry.promise;
}

export function setPublicResourceData<T>(key: string, data: T) {
  const entry = getOrCreateEntry<T>(key);
  entry.data = data;
  entry.updatedAt = Date.now();
  entry.listeners.forEach((cb) => cb(data));
}

export function invalidatePublicResource(key: string) {
  const entry = resourceStore.get(key);
  if (!entry) return;
  entry.updatedAt = 0;
  if (entry.fetcher && entry.listeners.size > 0) {
    runFetch(key, entry.fetcher).catch(() => {});
  }
}

export function clearPublicResources() {
  resourceStore.forEach((entry) => {
    entry.data = undefined;
    entry.updatedAt = 0;
    entry.promise = null;
    entry.listeners.forEach((cb) => cb(undefined));
  });
}

export function usePublicResource<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
    initialData?: T;
    placeholderData?: T;
  }
): { data: T | undefined; refetch: () => Promise<void> } {
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? 30_000;
  const refetchInterval = options?.refetchInterval;

  const [data, setData] = useState<T | undefined>(() => {
    const existing = resourceStore.get(key);
    if (existing?.data !== undefined) return existing.data as T;
    if (options?.initialData !== undefined) {
      const entry = getOrCreateEntry<T>(key, fetcher);
      entry.data = options.initialData;
      entry.updatedAt = Date.now();
      return options.initialData;
    }
    return options?.placeholderData;
  });

  useEffect(() => {
    const entry = getOrCreateEntry<T>(key, fetcher);
    const listener = (val: T | undefined) => setData(val);
    entry.listeners.add(listener);

    if (entry.data !== undefined) {
      setData(entry.data);
    }

    const isStale = !entry.updatedAt || Date.now() - entry.updatedAt > staleTime;
    if (enabled && isStale) {
      runFetch(key, fetcher).catch(() => {});
    }

    let timer: ReturnType<typeof setInterval> | undefined;
    if (enabled && refetchInterval && refetchInterval > 0) {
      timer = setInterval(() => {
        runFetch(key, fetcher).catch(() => {});
      }, refetchInterval);
    }

    return () => {
      entry.listeners.delete(listener);
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, staleTime, refetchInterval]);

  const refetch = async () => {
    await runFetch(key, fetcher).catch(() => undefined);
  };

  return { data, refetch };
}
