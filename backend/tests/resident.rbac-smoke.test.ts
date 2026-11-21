import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import wishlistRoutes from '../src/routes/wishlist.routes';
import bookingRoutes from '../src/routes/booking.routes';
import ticketRoutes from '../src/routes/ticket.routes';
import agreementRoutes from '../src/routes/agreement.routes';
import visitorPassRoutes from '../src/routes/visitorPass.routes';
import billSplitRoutes from '../src/routes/billSplit.routes';
import notificationRoutes from '../src/routes/notification.routes';
import prisma from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/jwt';

let server: http.Server;
let baseUrl = '';
let dbAvailable = false;
let tenantToken = '';

async function request(
  method: string,
  routePath: string,
  options?: { token?: string; body?: unknown }
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${baseUrl}${routePath}`, {
    method,
    headers,
    body: options?.body !== undefined && method !== 'GET' ? JSON.stringify(options.body) : undefined,
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
  app.use('/api/v1/wishlist', wishlistRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/tickets', ticketRoutes);
  app.use('/api/v1/agreements', agreementRoutes);
  app.use('/api/v1/visitor-passes', visitorPassRoutes);
  app.use('/api/v1/bill-splits', billSplitRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

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

    const tenant = await prisma.user.findFirst({
      where: { role: 'TENANT', isSuspended: false },
      select: { id: true, role: true, tokenVersion: true },
    });
    if (tenant) {
      tenantToken = generateAccessToken({
        id: tenant.id,
        role: tenant.role,
        tokenVersion: tenant.tokenVersion || 0,
      });
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

describe('Resident Router Static Security & Route Shadowing Audit', () => {
  const getRouteOrder = (router: any) =>
    (router.stack || [])
      .filter((l: any) => l.route)
      .map((l: any) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);

  it('mounts top-level authenticate on wishlist, tickets, agreements, visitor-passes, bill-splits, and notifications', () => {
    for (const [name, router] of [
      ['wishlistRoutes', wishlistRoutes],
      ['ticketRoutes', ticketRoutes],
      ['agreementRoutes', agreementRoutes],
      ['visitorPassRoutes', visitorPassRoutes],
      ['billSplitRoutes', billSplitRoutes],
      ['notificationRoutes', notificationRoutes],
    ] as const) {
      const stack: any[] = (router as any).stack || [];
      const firstRouteIdx = stack.findIndex((l) => Boolean(l.route));
      assert.ok(firstRouteIdx >= 1, `${name} must mount authenticate before routes`);
      assert.ok(
        stack.slice(0, firstRouteIdx).some((l) => l.name === 'authenticate'),
        `${name} missing top-level authenticate middleware`
      );
    }
  });

  it('registers static ticket and notification routes before parameterized /:id routes', () => {
    const ticketOrder = getRouteOrder(ticketRoutes);
    const paramTicketIdx = ticketOrder.indexOf('GET /:id');
    assert.ok(ticketOrder.indexOf('GET /me') < paramTicketIdx, 'GET /me must precede GET /:id');
    assert.ok(ticketOrder.indexOf('GET /landlord') < paramTicketIdx, 'GET /landlord must precede GET /:id');
    assert.ok(
      ticketOrder.indexOf('GET /admin/escalated') < paramTicketIdx,
      'GET /admin/escalated must precede GET /:id'
    );

    const notifOrder = getRouteOrder(notificationRoutes);
    assert.ok(
      notifOrder.indexOf('DELETE /clear') < notifOrder.indexOf('DELETE /:id'),
      'DELETE /clear must precede DELETE /:id'
    );
  });
});

describe('Resident Live HTTP RBAC & Isolation Matrix', () => {
  const residentReadEndpoints = [
    '/api/v1/wishlist',
    '/api/v1/bookings/me',
    '/api/v1/tickets/me',
    '/api/v1/agreements/tenant',
    '/api/v1/visitor-passes',
    '/api/v1/bill-splits',
    '/api/v1/notifications',
  ];

  it('rejects unauthenticated requests with 401 across all resident endpoints', async () => {
    for (const ep of residentReadEndpoints) {
      const res = await request('GET', ep);
      assert.equal(res.status, 401, `Expected 401 for unauthenticated GET ${ep}, got ${res.status}`);
    }
  });

  it('rejects forged/invalid JWT tokens with 401', async () => {
    const res = await request('GET', '/api/v1/wishlist', { token: 'invalid.jwt.token' });
    assert.equal(res.status, 401);
  });

  it('blocks TENANT tokens with 403 on elevated ticket and broadcast routes', async (t) => {
    if (!dbAvailable || !tenantToken) {
      t.skip('Active TENANT or database unavailable in test environment');
      return;
    }

    for (const [method, ep] of [
      ['GET', '/api/v1/tickets/landlord'],
      ['GET', '/api/v1/tickets/admin/escalated'],
      ['POST', '/api/v1/tickets/check-escalations'],
      ['POST', '/api/v1/notifications/broadcast'],
    ]) {
      const res = await request(method, ep, {
        token: tenantToken,
        body: method === 'GET' ? undefined : {},
      });
      assert.equal(res.status, 403, `Expected 403 for TENANT on ${method} ${ep}, got ${res.status}`);
    }
  });
});

describe('Resident Live Read Endpoints Smoke Suite', () => {
  const residentReadEndpoints = [
    '/api/v1/wishlist',
    '/api/v1/bookings/me',
    '/api/v1/tickets/me',
    '/api/v1/agreements/tenant',
    '/api/v1/visitor-passes',
    '/api/v1/bill-splits',
    '/api/v1/notifications',
  ];

  it('returns 200 OK with valid JSON on all 7 core resident read endpoints (including wishlist envelope)', async (t) => {
    if (!dbAvailable || !tenantToken) {
      t.skip('Active TENANT or database unavailable in test environment');
      return;
    }

    for (const ep of residentReadEndpoints) {
      const res = await request('GET', ep, { token: tenantToken });
      assert.equal(
        res.status,
        200,
        `Expected 200 OK on GET ${ep}, got ${res.status}: ${JSON.stringify(res.json)}`
      );
      assert.notEqual(res.json, null, `Expected JSON payload on GET ${ep}`);
      if (ep === '/api/v1/wishlist') {
        assert.ok(Array.isArray(res.json.properties), 'Wishlist response must include properties[]');
        assert.ok(Array.isArray(res.json.savedPropertyIds), 'Wishlist response must include savedPropertyIds[]');
      }
    }
  });

  it('returns clean 404 (not 500) on nonexistent booking, ticket, and agreement IDs', async (t) => {
    if (!dbAvailable || !tenantToken) {
      t.skip('Active TENANT or database unavailable in test environment');
      return;
    }

    for (const ep of [
      '/api/v1/bookings/nonexistent-id-000',
      '/api/v1/tickets/nonexistent-id-000',
      '/api/v1/agreements/booking/nonexistent-id-000',
    ]) {
      const res = await request('GET', ep, { token: tenantToken });
      assert.equal(res.status, 404, `Expected 404 on GET ${ep}, got ${res.status}`);
    }
  });
});
