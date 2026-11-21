import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import propertyRoutes from '../src/routes/property.routes';
import bookingRoutes from '../src/routes/booking.routes';
import payoutRoutes from '../src/routes/payout.routes';
import subscriptionRoutes from '../src/routes/subscription.routes';
import expenseRoutes from '../src/routes/expense.routes';
import staffRoutes from '../src/routes/staff.routes';
import prisma from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/jwt';

let server: http.Server;
let baseUrl = '';
let dbAvailable = false;

let tenantToken = '';
let landlordToken = '';
let landlordId = '';
let otherLandlordPropertyId = '';

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
  app.use('/api/v1/properties', propertyRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/payouts', payoutRoutes);
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  app.use('/api/v1/expenses', expenseRoutes);
  app.use('/api/v1/staff', staffRoutes);

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

    const landlord = await prisma.user.findFirst({
      where: { role: 'LANDLORD', isSuspended: false },
      select: { id: true, role: true, tokenVersion: true },
    });
    if (landlord) {
      landlordId = landlord.id;
      landlordToken = generateAccessToken({
        id: landlord.id,
        role: landlord.role,
        tokenVersion: landlord.tokenVersion || 0,
      });

      const foreignProp = await prisma.property.findFirst({
        where: { landlordId: { not: landlord.id } },
        select: { id: true },
      });
      if (foreignProp) {
        otherLandlordPropertyId = foreignProp.id;
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

describe('Landlord Router Static Security & Route Shadowing Audit', () => {
  const getRouteOrder = (router: any) =>
    (router.stack || [])
      .filter((l: any) => l.route)
      .map((l: any) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);

  it('registers static landlord property routes before /:id', () => {
    const order = getRouteOrder(propertyRoutes);
    const statsIdx = order.indexOf('GET /landlord/stats');
    const mineIdx = order.indexOf('GET /landlord/mine');
    const paramIdx = order.indexOf('GET /:id');
    assert.ok(statsIdx !== -1 && mineIdx !== -1 && paramIdx !== -1);
    assert.ok(statsIdx < paramIdx, 'GET /landlord/stats must precede GET /:id');
    assert.ok(mineIdx < paramIdx, 'GET /landlord/mine must precede GET /:id');
  });

  it('registers static booking routes before /:id', () => {
    const order = getRouteOrder(bookingRoutes);
    const landlordIdx = order.indexOf('GET /landlord');
    const meIdx = order.indexOf('GET /me');
    const paramIdx = order.indexOf('GET /:id');
    assert.ok(landlordIdx !== -1 && meIdx !== -1 && paramIdx !== -1);
    assert.ok(landlordIdx < paramIdx, 'GET /landlord must precede GET /:id');
    assert.ok(meIdx < paramIdx, 'GET /me must precede GET /:id');
  });

  it('registers expense analytics before /:id and staff /mine before /:id', () => {
    const expOrder = getRouteOrder(expenseRoutes);
    assert.ok(
      expOrder.indexOf('GET /analytics/summary') < expOrder.indexOf('DELETE /:id'),
      'GET /analytics/summary must precede DELETE /:id'
    );
    const staffOrder = getRouteOrder(staffRoutes);
    assert.ok(
      staffOrder.indexOf('GET /mine') < staffOrder.indexOf('DELETE /:id'),
      'GET /mine must precede DELETE /:id'
    );
  });
});

describe('Landlord Live HTTP RBAC & Isolation Matrix', () => {
  const protectedLandlordEndpoints = [
    '/api/v1/properties/landlord/stats',
    '/api/v1/properties/landlord/mine',
    '/api/v1/bookings/landlord',
    '/api/v1/payouts/history',
    '/api/v1/payouts/banks',
    '/api/v1/subscriptions/overview',
    '/api/v1/subscriptions/fee',
    '/api/v1/expenses',
    '/api/v1/staff',
  ];

  it('rejects unauthenticated requests with 401 across all landlord endpoints', async () => {
    for (const ep of protectedLandlordEndpoints) {
      const res = await request('GET', ep);
      assert.equal(res.status, 401, `Expected 401 for unauthenticated GET ${ep}, got ${res.status}`);
    }
  });

  it('rejects forged/invalid JWT tokens with 401', async () => {
    const res = await request('GET', '/api/v1/properties/landlord/stats', { token: 'invalid.jwt.token' });
    assert.equal(res.status, 401);
  });

  it('blocks TENANT tokens with 403 across landlord-only endpoints', async (t) => {
    if (!dbAvailable || !tenantToken) {
      t.skip('Active TENANT or database unavailable in test environment');
      return;
    }

    const landlordOnlyEndpoints = [
      '/api/v1/properties/landlord/stats',
      '/api/v1/properties/landlord/mine',
      '/api/v1/bookings/landlord',
      '/api/v1/payouts/history',
      '/api/v1/payouts/banks',
      '/api/v1/subscriptions/overview',
      '/api/v1/subscriptions/fee',
    ];

    for (const ep of landlordOnlyEndpoints) {
      const res = await request('GET', ep, { token: tenantToken });
      assert.equal(res.status, 403, `Expected 403 for TENANT on GET ${ep}, got ${res.status}`);
    }
  });

  it('blocks cross-landlord mutation (403) on another landlord property', async (t) => {
    if (!dbAvailable || !landlordToken || !otherLandlordPropertyId) {
      t.skip('Need at least two distinct landlords with properties in DB');
      return;
    }

    const res = await request('DELETE', `/api/v1/properties/${otherLandlordPropertyId}`, {
      token: landlordToken,
    });
    assert.equal(
      res.status,
      403,
      `Expected 403 when landlord ${landlordId} tries to delete foreign property ${otherLandlordPropertyId}, got ${res.status}`
    );
  });
});

describe('Landlord Live Read Endpoints Smoke Suite', () => {
  const landlordReadEndpoints = [
    '/api/v1/properties/landlord/stats',
    '/api/v1/properties/landlord/mine',
    '/api/v1/bookings/landlord',
    '/api/v1/payouts/history',
    '/api/v1/subscriptions/overview',
    '/api/v1/subscriptions/fee',
    '/api/v1/expenses',
    '/api/v1/expenses/analytics/summary',
    '/api/v1/staff',
  ];

  it('returns 200 OK with valid JSON on all 9 core landlord read endpoints', async (t) => {
    if (!dbAvailable || !landlordToken) {
      t.skip('Active LANDLORD or database unavailable in test environment');
      return;
    }

    for (const ep of landlordReadEndpoints) {
      const res = await request('GET', ep, { token: landlordToken });
      assert.equal(
        res.status,
        200,
        `Expected 200 OK on GET ${ep}, got ${res.status}: ${JSON.stringify(res.json)}`
      );
      assert.notEqual(res.json, null, `Expected JSON payload on GET ${ep}`);
    }
  });

  it('returns clean 404 (not 500) on nonexistent property and booking IDs', async (t) => {
    if (!dbAvailable || !landlordToken) {
      t.skip('Active LANDLORD or database unavailable in test environment');
      return;
    }

    for (const ep of [
      '/api/v1/properties/nonexistent-id-000',
      '/api/v1/bookings/nonexistent-id-000',
    ]) {
      const res = await request('GET', ep, { token: landlordToken });
      assert.equal(res.status, 404, `Expected 404 on GET ${ep}, got ${res.status}`);
    }
  });
});
