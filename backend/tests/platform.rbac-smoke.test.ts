import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { isAdminRole, optionalAuthenticate, authenticate, authorizeRole } from '../src/middleware/auth.middleware';
import { createRateLimitStore, isRedisAvailable } from '../src/utils/redis';
import { loginRateLimiter, apiRateLimiter } from '../src/middleware/rateLimiter.middleware';
import bookingRoutes from '../src/routes/booking.routes';
import ticketRoutes from '../src/routes/ticket.routes';
import authRoutes from '../src/routes/auth.routes';
import prisma from '../src/utils/prisma';
import { generateAccessToken, generateRefreshToken } from '../src/utils/jwt';

let server: http.Server;
let baseUrl = '';
let dbAvailable = false;

const tokens: Partial<Record<'TENANT' | 'LANDLORD' | 'ADMIN' | 'SUPER_ADMIN', string>> = {};
let sampleUser: any = null;

async function request(
  method: string,
  routePath: string,
  options?: { token?: string; body?: unknown; headers?: Record<string, string>; cookie?: string }
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options?.cookie) {
    headers['Cookie'] = options.cookie;
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
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, json, headers: res.headers, setCookie };
}

before(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/auth', authRoutes);

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
      let user = await prisma.user.findFirst({
        where: { role, isSuspended: false },
        select: { id: true, email: true, role: true, tokenVersion: true },
      });
      if (user) {
        if (!sampleUser) sampleUser = user;
        tokens[role] = generateAccessToken({
          id: user.id,
          email: user.email,
          role: user.role,
          tokenVersion: user.tokenVersion || 0,
        });
      }
    }
  } catch (err) {
    console.warn('[Platform RBAC Suite] Database not reachable. Live tests using DB will be skipped.', err);
    dbAvailable = false;
  }
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  if (dbAvailable) {
    await prisma.$disconnect();
  }
});

describe('Platform RBAC Utility Unit Tests', () => {
  it('isAdminRole correctly identifies administrator privileges', () => {
    assert.equal(isAdminRole('ADMIN'), true);
    assert.equal(isAdminRole('SUPER_ADMIN'), true);
    assert.equal(isAdminRole('TENANT'), false);
    assert.equal(isAdminRole('LANDLORD'), false);
    assert.equal(isAdminRole('CARETAKER'), false);
    assert.equal(isAdminRole('STAFF'), false);
    assert.equal(isAdminRole(undefined), false);
    assert.equal(isAdminRole(null), false);
    assert.equal(isAdminRole(''), false);
  });

  it('verifies zero raw unadmitted ADMIN role checks in backend controllers', () => {
    const controllerDir = path.resolve(__dirname, '../src/controllers');
    const rawPattern = /(role\s*===?\s*['"]ADMIN['"]|role\s*!==?\s*['"]ADMIN['"])/;
    
    const violations: string[] = [];
    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (rawPattern.test(line) && !line.includes('SUPER_ADMIN') && !line.includes('portal')) {
              violations.push(`${entry.name}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
    scanDir(controllerDir);
    assert.deepEqual(violations, [], `Found raw role equality checks without SUPER_ADMIN: ${violations.join('\n')}`);
  });
});

describe('Token Hardening & Anti-XSS Cookie Isolation Tests', () => {
  it('verifies zero controllers return refreshToken in response JSON payloads (AST / static scan)', () => {
    const controllerDir = path.resolve(__dirname, '../src/controllers');
    const violations: string[] = [];
    const responseJsonRegex = /res(?:\.[a-zA-Z0-9_]+)*\.json\s*\(\s*\{[\s\S]*?refreshToken[\s\S]*?\}\s*\)/g;
    
    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(responseJsonRegex);
          if (matches) {
            violations.push(`${entry.name}: ${matches.join(' | ')}`);
          }
        }
      }
    }
    scanDir(controllerDir);
    assert.deepEqual(violations, [], `Found exposed refreshToken in response JSON: ${violations.join('\n')}`);
  });

  it('token refresh rotates session and omits refreshToken from JSON response while setting HttpOnly cookie', async (t) => {
    if (!sampleUser) return t.skip('No user available in DB for session creation');
    
    // Create a real session in DB
    const testRefreshToken = generateRefreshToken({ id: sampleUser.id, tokenVersion: sampleUser.tokenVersion || 0 });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await prisma.session.create({
      data: {
        userId: sampleUser.id,
        refreshToken: testRefreshToken,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        deviceFamily: 'Desktop',
        osFamily: 'Windows',
        expiresAt
      }
    });

    const res = await request('POST', '/api/auth/refresh', {
      cookie: `refreshToken=${testRefreshToken}`
    });

    assert.equal(res.status, 200, `Expected 200 on refresh, got ${res.status}`);
    assert.ok(res.json?.accessToken, 'Expected accessToken in JSON body');
    assert.equal(res.json?.refreshToken, undefined, 'CRITICAL: refreshToken MUST NOT be present in JSON body');
    assert.ok(res.setCookie, 'Expected Set-Cookie header on refresh response');
    assert.match(res.setCookie || '', /refreshToken=[^;]+/, 'Expected refreshToken cookie to be set');
    assert.match(res.setCookie || '', /HttpOnly/i, 'Expected refreshToken cookie to have HttpOnly flag');
  });
});

describe('Rent Due Reminders Route RBAC Matrix', () => {
  it('blocks unauthenticated trigger of /api/bookings/check-rent-due with 403', async () => {
    const res = await request('POST', '/api/bookings/check-rent-due');
    assert.equal(res.status, 403, `Expected 403 Forbidden without credentials, got ${res.status}`);
    assert.match(res.json?.message || '', /Forbidden/i);
  });

  it('blocks TENANT bearer token from triggering /api/bookings/check-rent-due with 403', async (t) => {
    if (!tokens.TENANT) return t.skip('No TENANT user available in DB');
    const res = await request('POST', '/api/bookings/check-rent-due', { token: tokens.TENANT });
    assert.equal(res.status, 403, `Expected 403 for TENANT, got ${res.status}`);
  });

  it('blocks LANDLORD bearer token from triggering /api/bookings/check-rent-due with 403', async (t) => {
    if (!tokens.LANDLORD) return t.skip('No LANDLORD user available in DB');
    const res = await request('POST', '/api/bookings/check-rent-due', { token: tokens.LANDLORD });
    assert.equal(res.status, 403, `Expected 403 for LANDLORD, got ${res.status}`);
  });

  it('allows ADMIN bearer token to trigger /api/bookings/check-rent-due (200 OK)', async (t) => {
    if (!tokens.ADMIN) return t.skip('No ADMIN user available in DB');
    const res = await request('POST', '/api/bookings/check-rent-due', { token: tokens.ADMIN });
    assert.equal(res.status, 200, `Expected 200 for ADMIN, got ${res.status}`);
    assert.match(res.json?.message || '', /Rent due reminders processed/i);
  });

  it('allows SUPER_ADMIN bearer token to trigger /api/bookings/check-rent-due (200 OK)', async (t) => {
    if (!tokens.SUPER_ADMIN) return t.skip('No SUPER_ADMIN user available in DB');
    const res = await request('POST', '/api/bookings/check-rent-due', { token: tokens.SUPER_ADMIN });
    assert.equal(res.status, 200, `Expected 200 for SUPER_ADMIN, got ${res.status}`);
    assert.match(res.json?.message || '', /Rent due reminders processed/i);
  });

  it('allows cron trigger with valid x-cron-secret header (200 OK)', async () => {
    const testSecret = process.env.CRON_SECRET || 'cron-test-secret';
    process.env.CRON_SECRET = testSecret;
    const res = await request('POST', '/api/bookings/check-rent-due', {
      headers: { 'x-cron-secret': testSecret }
    });
    assert.equal(res.status, 200, `Expected 200 for valid cron secret, got ${res.status}`);
    assert.match(res.json?.message || '', /Rent due reminders processed/i);
  });
});

describe('Super Admin & Admin Controller Parity Tests', () => {
  it('allows both ADMIN and SUPER_ADMIN on landlord tickets route', async (t) => {
    if (!tokens.ADMIN && !tokens.SUPER_ADMIN) return t.skip('No admin tokens available in DB');
    
    if (tokens.ADMIN) {
      const resAdmin = await request('GET', '/api/tickets/landlord', { token: tokens.ADMIN });
      assert.notEqual(resAdmin.status, 403, `ADMIN should not be 403 on /tickets/landlord, got ${resAdmin.status}`);
    }
    if (tokens.SUPER_ADMIN) {
      const resSuper = await request('GET', '/api/tickets/landlord', { token: tokens.SUPER_ADMIN });
      assert.notEqual(resSuper.status, 403, `SUPER_ADMIN should not be 403 on /tickets/landlord, got ${resSuper.status}`);
    }
  });

  it('allows both ADMIN and SUPER_ADMIN on landlord bookings route', async (t) => {
    if (!tokens.ADMIN && !tokens.SUPER_ADMIN) return t.skip('No admin tokens available in DB');
    
    if (tokens.ADMIN) {
      const resAdmin = await request('GET', '/api/bookings/landlord', { token: tokens.ADMIN });
      assert.notEqual(resAdmin.status, 403, `ADMIN should not be 403 on /bookings/landlord, got ${resAdmin.status}`);
    }
    if (tokens.SUPER_ADMIN) {
      const resSuper = await request('GET', '/api/bookings/landlord', { token: tokens.SUPER_ADMIN });
      assert.notEqual(resSuper.status, 403, `SUPER_ADMIN should not be 403 on /bookings/landlord, got ${resSuper.status}`);
    }
  });
});

describe('Distributed Redis Rate Limiting Architecture Tests', () => {
  it('falls back to memory store when REDIS_URL is unconfigured', () => {
    const store = createRateLimitStore('test-unconfigured');
    assert.equal(store, undefined, 'Expected createRateLimitStore to return undefined (memory store) when Redis is unset');
  });

  it('creates an initialized RedisStore instance when a Redis client is supplied', () => {
    const mockClient = {
      call: async () => ['1', '1000'],
    };
    const store = createRateLimitStore('test-cluster', mockClient);
    assert.ok(store, 'Expected RedisStore instance to be created');
    assert.equal(typeof (store as any).init, 'function');
    assert.equal((store as any).prefix, 'rl:test-cluster:');
  });

  it('isRedisAvailable returns boolean without throwing error', () => {
    const available = isRedisAvailable();
    assert.equal(typeof available, 'boolean');
  });

  it('rate limiters with Redis store support export valid express middleware functions', () => {
    assert.equal(typeof loginRateLimiter, 'function');
    assert.equal(typeof apiRateLimiter, 'function');
  });
});
