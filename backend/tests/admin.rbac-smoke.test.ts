import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as adminController from '../src/controllers/admin.controller';
import adminRoutes from '../src/routes/admin.routes';
import prisma from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/jwt';

let server: http.Server;
let baseUrl = '';
let dbAvailable = false;

const tokens: Partial<Record<'TENANT' | 'LANDLORD' | 'ADMIN' | 'SUPER_ADMIN', string>> = {};

async function request(
  method: string,
  routePath: string,
  options?: { token?: string; body?: unknown; headers?: Record<string, string> }
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${baseUrl}${routePath}`, {
    method,
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

before(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/admin', adminRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;

    for (const role of ['TENANT', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN'] as const) {
      const user = await prisma.user.findFirst({
        where: { role, isSuspended: false },
        select: { id: true, role: true, tokenVersion: true },
      });
      if (user) {
        tokens[role] = generateAccessToken({
          id: user.id,
          role: user.role,
          tokenVersion: user.tokenVersion || 0,
        });
      }
    }
  } catch {
    dbAvailable = false;
  }
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await prisma.$disconnect().catch(() => {});
});

describe('Admin Controller Barrel Integrity', () => {
  it('exports all 52 admin domain handlers as functions', () => {
    const expectedExports = [
      'getSystemStats',
      'getActionRequiredQueue',
      'getPlatformAnalytics',
      'searchEntities',
      'getSystemActivity',
      'getLiveHealthHeartbeat',
      'getAllUsers',
      'getUserById',
      'getAdministrators',
      'createAdministrator',
      'toggleAdminStatus',
      'toggleUserSuspension',
      'toggleUserProfileLock',
      'verifyUserCard',
      'verifyLandlord',
      'createLandlord',
      'updateLandlordProfile',
      'createTenant',
      'updateTenantProfile',
      'updateLandlordSettlement',
      'getAllProperties',
      'getPropertyById',
      'updatePropertyApproval',
      'bulkUpdatePropertyApproval',
      'togglePropertyPhysicalVerification',
      'getAllBookings',
      'getBookingById',
      'getAllReviews',
      'getReviewById',
      'deleteReview',
      'getAllSubscriptions',
      'getSubscriptionById',
      'activateSubscription',
      'revokeSubscription',
      'getAllTransactions',
      'getTransactionById',
      'getAllPayouts',
      'updatePayoutStatus',
      'reconcileManualEscrow',
      'getDisputeById',
      'resolveAppeal',
      'getAllTickets',
      'getTicketById',
      'adminUpdateTicketStatus',
      'broadcastNotification',
      'getBroadcastHistory',
      'getAuditLogs',
      'getConfig',
      'updateConfig',
      'getMaintenanceHistory',
      'getWebhookDLQ',
      'retryWebhookDelivery',
    ];

    for (const name of expectedExports) {
      assert.equal(
        typeof (adminController as Record<string, unknown>)[name],
        'function',
        `Expected admin.controller export "${name}" to be a function`
      );
    }
  });
});

describe('Admin Router Static Security & Route Shadowing Audit', () => {
  const stack: any[] = (adminRoutes as any).stack || [];

  it('mounts authenticate and authorizeRole middleware before all route handlers', () => {
    const firstRouteIdx = stack.findIndex((layer) => Boolean(layer.route));
    assert.ok(firstRouteIdx >= 2, 'Expected top-level auth middlewares before first route');

    const preRouteLayers = stack.slice(0, firstRouteIdx);
    assert.ok(
      preRouteLayers.some((l) => l.name === 'authenticate'),
      'Missing top-level authenticate middleware'
    );
    assert.ok(
      preRouteLayers.filter((l) => typeof l.handle === 'function').length >= 2,
      'Missing top-level authorizeRole middleware'
    );
  });

  it('registers static sub-routes before parameterized /:id routes to prevent shadowing', () => {
    const routeOrder = stack
      .filter((l) => l.route)
      .map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);

    const assertBefore = (staticRoute: string, paramRoute: string) => {
      const sIdx = routeOrder.indexOf(staticRoute);
      const pIdx = routeOrder.indexOf(paramRoute);
      assert.ok(sIdx !== -1, `Route not found: ${staticRoute}`);
      assert.ok(pIdx !== -1, `Route not found: ${paramRoute}`);
      assert.ok(sIdx < pIdx, `Route shadowing detected: "${staticRoute}" must come before "${paramRoute}"`);
    };

    assertBefore('PUT /properties/bulk-status', 'PUT /properties/:id/status');
    assertBefore('PUT /notices/reorder', 'PUT /notices/:id');
    assertBefore('POST /payouts/reconcile', 'PUT /payouts/:id/status');
  });

  it('enforces requireSuperAdmin and requireStepUpAuth on elevated routes', () => {
    const findRouteHandlers = (method: string, routePath: string): string[] => {
      const layer = stack.find(
        (l) => l.route && l.route.path === routePath && l.route.methods[method.toLowerCase()]
      );
      assert.ok(layer, `Route ${method} ${routePath} must exist`);
      return layer.route.stack.map((s: any) => s.name);
    };

    for (const [method, p] of [
      ['GET', '/administrators'],
      ['POST', '/administrators'],
      ['PUT', '/administrators/:id/status'],
      ['PUT', '/config'],
      ['POST', '/payouts/reconcile'],
      ['PUT', '/payouts/:id/status'],
    ]) {
      const handlers = findRouteHandlers(method, p);
      assert.ok(
        handlers.includes('requireSuperAdmin'),
        `${method} ${p} must include requireSuperAdmin`
      );
    }

    for (const [method, p] of [
      ['PUT', '/verify-landlord/:id'],
      ['PUT', '/landlords/:id/settlement'],
      ['PUT', '/landlord-deeds/:id/audit'],
      ['PUT', '/payouts/:id/status'],
    ]) {
      const handlers = findRouteHandlers(method, p);
      assert.ok(
        handlers.includes('requireStepUpAuth'),
        `${method} ${p} must include requireStepUpAuth`
      );
    }
  });
});

describe('Admin Live HTTP RBAC Matrix', () => {
  it('rejects unauthenticated requests with 401 across admin endpoints', async () => {
    for (const ep of ['/api/admin/stats', '/api/admin/users', '/api/admin/config', '/api/admin/administrators']) {
      const res = await request('GET', ep);
      assert.equal(res.status, 401, `Expected 401 for unauthenticated GET ${ep}, got ${res.status}`);
    }
  });

  it('rejects forged/invalid JWT tokens with 401', async () => {
    const res = await request('GET', '/api/admin/stats', { token: 'invalid.jwt.token' });
    assert.equal(res.status, 401);
  });

  it('blocks TENANT and LANDLORD tokens with 403 across admin endpoints', async (t) => {
    if (!dbAvailable) {
      t.skip('Database unavailable in test environment');
      return;
    }

    for (const role of ['TENANT', 'LANDLORD'] as const) {
      const token = tokens[role];
      if (!token) continue;
      for (const ep of ['/api/admin/stats', '/api/admin/users', '/api/admin/bookings', '/api/admin/payouts']) {
        const res = await request('GET', ep, { token });
        assert.equal(res.status, 403, `Expected 403 for ${role} on GET ${ep}, got ${res.status}`);
      }
    }
  });

  it('blocks standard ADMIN from SUPER_ADMIN routes and requires step-up auth on critical actions', async (t) => {
    if (!dbAvailable) {
      t.skip('Database unavailable in test environment');
      return;
    }

    if (tokens.ADMIN) {
      for (const [method, ep] of [
        ['GET', '/api/admin/administrators'],
        ['PUT', '/api/admin/config'],
        ['POST', '/api/admin/payouts/reconcile'],
      ]) {
        const res = await request(method, ep, {
          token: tokens.ADMIN,
          body: method === 'GET' ? undefined : {},
        });
        assert.equal(res.status, 403, `Expected 403 for ADMIN on ${method} ${ep}, got ${res.status}`);
      }
    }

    const elevatedToken = tokens.SUPER_ADMIN || tokens.ADMIN;
    if (elevatedToken) {
      const res = await request('PUT', '/api/admin/verify-landlord/nonexistent-test-id', {
        token: elevatedToken,
        body: { status: 'VERIFIED' },
      });
      assert.equal(res.status, 403, 'Expected 403 when X-Step-Up-Token is missing');
      assert.equal(res.json?.requireStepUp, true, 'Expected requireStepUp: true flag in 403 response');
    }
  });
});

describe('Admin Live Read Endpoints Smoke Suite', () => {
  const adminReadEndpoints = [
    '/api/admin/stats',
    '/api/admin/action-queue',
    '/api/admin/analytics',
    '/api/admin/activity',
    '/api/admin/audit-logs',
    '/api/admin/health-heartbeat',
    '/api/admin/webhooks/dlq',
    '/api/admin/users',
    '/api/admin/properties',
    '/api/admin/bookings',
    '/api/admin/subscriptions',
    '/api/admin/transactions',
    '/api/admin/payouts',
    '/api/admin/reviews',
    '/api/admin/tickets',
    '/api/admin/notices',
    '/api/admin/breaches',
    '/api/admin/landlord-deeds',
    '/api/admin/administrators',
    '/api/admin/config',
    '/api/admin/maintenance/history',
    '/api/admin/notifications/broadcasts/history',
  ];

  it('returns 200 OK with valid JSON on all admin read endpoints', async (t) => {
    const activeAdminToken = tokens.SUPER_ADMIN || tokens.ADMIN;
    if (!dbAvailable || !activeAdminToken) {
      t.skip('Active ADMIN/SUPER_ADMIN or database unavailable in test environment');
      return;
    }

    for (const ep of adminReadEndpoints) {
      if (ep === '/api/admin/administrators' && !tokens.SUPER_ADMIN) {
        continue; // SUPER_ADMIN-only route already verified for 403 on ADMIN above
      }
      const res = await request('GET', ep, { token: activeAdminToken });
      assert.equal(
        res.status,
        200,
        `Expected 200 OK on GET ${ep}, got ${res.status}: ${JSON.stringify(res.json)}`
      );
      assert.notEqual(res.json, null, `Expected JSON payload on GET ${ep}`);
    }
  });

  it('returns clean 404 (not 500) on nonexistent detail IDs', async (t) => {
    const activeAdminToken = tokens.SUPER_ADMIN || tokens.ADMIN;
    if (!dbAvailable || !activeAdminToken) {
      t.skip('Active ADMIN/SUPER_ADMIN or database unavailable in test environment');
      return;
    }

    for (const ep of [
      '/api/admin/bookings/nonexistent-id-000',
      '/api/admin/properties/nonexistent-id-000',
      '/api/admin/users/nonexistent-id-000',
      '/api/admin/tickets/nonexistent-id-000',
    ]) {
      const res = await request('GET', ep, { token: activeAdminToken });
      assert.equal(res.status, 404, `Expected 404 on GET ${ep}, got ${res.status}`);
    }
  });
});
