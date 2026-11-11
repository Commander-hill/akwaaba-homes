import dynamic from 'next/dynamic';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import QueryProvider from '@/providers/QueryProvider';
import AdminLoginChrome from '@/components/admin/AdminLoginChrome';

const AdminPortalGate = dynamic(() => import('@/components/admin/AdminPortalGate'));

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isSameCookieHost(apiBase: string, requestHost: string): boolean {
  if (apiBase.startsWith('/')) return true;
  try {
    const apiHost = new URL(apiBase).hostname.toLowerCase();
    const reqHostname = requestHost.split(':')[0].toLowerCase();
    if (!reqHostname) return false;
    if (apiHost === reqHostname) return true;
    return LOOPBACK_HOSTS.has(apiHost) && LOOPBACK_HOSTS.has(reqHostname);
  } catch {
    return false;
  }
}

async function resolveAdminSession(): Promise<{
  initialUser: any | null;
  initialFetchedAt?: number;
}> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  const rawApiBase = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000/api/v1'
  ).replace(/\/$/, '');
  const reqHost = requestHeaders.get('host') || '';
  const reqProto = requestHeaders.get('x-forwarded-proto') || 'http';
  const apiBase = rawApiBase.startsWith('/') && reqHost
    ? `${reqProto}://${reqHost}${rawApiBase}`
    : rawApiBase;
  const sameHost = isSameCookieHost(rawApiBase, reqHost);

  if (!accessToken) {
    if (sameHost && !refreshToken) {
      redirect('/admin/login');
    }
    return { initialUser: null };
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let authStatus = 0;
  let user: any = null;

  try {
    const res = await fetch(`${apiBase}/auth/me`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });
    authStatus = res.status;
    if (res.ok) {
      const data = await res.json();
      user = data?.user ?? null;
    }
  } catch {
    return { initialUser: null };
  }

  if (user) {
    if (!ADMIN_ROLES.has(user.role)) {
      redirect('/login');
    }
    return { initialUser: user, initialFetchedAt: Date.now() };
  }

  if ((authStatus === 401 || authStatus === 403) && sameHost && !refreshToken) {
    redirect('/admin/login');
  }

  return { initialUser: null };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (pathname === '/admin/login') {
    return (
      <QueryProvider>
        <AdminLoginChrome>{children}</AdminLoginChrome>
      </QueryProvider>
    );
  }

  const { initialUser, initialFetchedAt } = await resolveAdminSession();

  return (
    <QueryProvider>
      <AdminPortalGate initialUser={initialUser} initialFetchedAt={initialFetchedAt}>
        {children}
      </AdminPortalGate>
    </QueryProvider>
  );
}
