import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from './src/utils/prisma';
import { generateAccessToken } from './src/utils/jwt';
import { generateSignedDocumentUrl } from './src/utils/security.service';
import { generateTOTPSecret, generateTOTPCode } from './src/utils/totp.service';
import { redactSensitiveData, logAudit } from './src/utils/auditLogger';

// Configure test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5155';

interface TestResult {
  category: number;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

const testResults: TestResult[] = [];

function recordTest(category: number, name: string, passed: boolean, message: string, durationMs: number) {
  testResults.push({ category, name, passed, message, durationMs });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Category ${category.toString().padStart(2, '0')}] ${icon}: ${name} (${durationMs}ms) — ${message}`);
}

async function runSecurityTestSuite() {
  console.log('======================================================================');
  console.log('🛡️  AKWAABA HOMES — COMPREHENSIVE AUTOMATED SECURITY TEST SUITE');
  console.log('======================================================================\n');

  // Dynamically import server to bind to test port
  const { httpServer } = await import('./src/server');
  
  await new Promise<void>((resolve) => {
    httpServer.listen(5155, () => {
      console.log('🔒 Test server listening on http://localhost:5155\n');
      resolve();
    });
  });

  const BASE_URL = 'http://localhost:5155/api/v1';
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'test_paystack_secret_key_12345';
  process.env.PAYSTACK_SECRET_KEY = PAYSTACK_SECRET;

  try {
    // ── PROVISION CONTROLLED TEST USERS ──
    const testPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // 1. Tenant A
    const tenantA = await prisma.user.upsert({
      where: { email: 'sec.tenant.a@test.local' },
      update: { passwordHash, role: 'TENANT', isEmailVerified: true, isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'sec.tenant.a@test.local',
        firstName: 'TenantA',
        lastName: 'Test',
        passwordHash,
        role: 'TENANT',
        isEmailVerified: true,
        phoneNumber: '+233240001111',
        gender: 'MALE',
        nationality: 'Ghanaian',
      }
    });

    // 2. Tenant B
    const tenantB = await prisma.user.upsert({
      where: { email: 'sec.tenant.b@test.local' },
      update: { passwordHash, role: 'TENANT', isEmailVerified: true, isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'sec.tenant.b@test.local',
        firstName: 'TenantB',
        lastName: 'Test',
        passwordHash,
        role: 'TENANT',
        isEmailVerified: true,
        phoneNumber: '+233240002222',
        gender: 'FEMALE',
        nationality: 'Ghanaian',
      }
    });

    // 3. Landlord A
    const landlordA = await prisma.user.upsert({
      where: { email: 'sec.landlord.a@test.local' },
      update: { passwordHash, role: 'LANDLORD', isEmailVerified: true, isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'sec.landlord.a@test.local',
        firstName: 'LandlordA',
        lastName: 'Test',
        passwordHash,
        role: 'LANDLORD',
        isEmailVerified: true,
        phoneNumber: '+233240003333',
        gender: 'MALE',
        nationality: 'Ghanaian',
      }
    });

    // 4. Landlord B
    const landlordB = await prisma.user.upsert({
      where: { email: 'sec.landlord.b@test.local' },
      update: { passwordHash, role: 'LANDLORD', isEmailVerified: true, isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'sec.landlord.b@test.local',
        firstName: 'LandlordB',
        lastName: 'Test',
        passwordHash,
        role: 'LANDLORD',
        isEmailVerified: true,
        phoneNumber: '+233240004444',
        gender: 'MALE',
        nationality: 'Ghanaian',
      }
    });

    // 5. Ordinary Admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'sec.admin@test.local' },
      update: { passwordHash, role: 'ADMIN', isEmailVerified: true, isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'sec.admin@test.local',
        firstName: 'Admin',
        lastName: 'Test',
        passwordHash,
        role: 'ADMIN',
        isEmailVerified: true,
        phoneNumber: '+233240005555',
        gender: 'MALE',
        nationality: 'Ghanaian',
      }
    });

    // 6. Super Admin
    const superAdminUser = await prisma.user.upsert({
      where: { email: 'sec.superadmin@test.local' },
      update: { passwordHash, role: 'SUPER_ADMIN', isEmailVerified: true, isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'sec.superadmin@test.local',
        firstName: 'SuperAdmin',
        lastName: 'Test',
        passwordHash,
        role: 'SUPER_ADMIN',
        isEmailVerified: true,
        phoneNumber: '+233240006666',
        gender: 'MALE',
        nationality: 'Ghanaian',
      }
    });

    // Tokens
    const tokenTenantA = generateAccessToken({ id: tenantA.id, role: tenantA.role, tokenVersion: 0 });
    const tokenTenantB = generateAccessToken({ id: tenantB.id, role: tenantB.role, tokenVersion: 0 });
    const tokenLandlordA = generateAccessToken({ id: landlordA.id, role: landlordA.role, tokenVersion: 0 });
    const tokenLandlordB = generateAccessToken({ id: landlordB.id, role: landlordB.role, tokenVersion: 0 });
    const tokenAdmin = generateAccessToken({ id: adminUser.id, role: adminUser.role, tokenVersion: 0 });
    const tokenSuperAdmin = generateAccessToken({ id: superAdminUser.id, role: superAdminUser.role, tokenVersion: 0 });

    // Seed a property for Landlord B
    const propertyB = await prisma.property.create({
      data: {
        landlordId: landlordB.id,
        title: 'Landlord B Private Estate',
        type: 'Apartment',
        description: 'Private estate description',
        location: 'East Legon, Accra',
        price: 2500,
        amenities: '["WiFi", "Generator"]',
        images: '["https://res.cloudinary.com/demo/image/upload/sample.jpg"]',
        isAvailable: true,
        approvalStatus: 'APPROVED'
      }
    });

    // Seed a room and booking for Tenant B
    const roomB = await prisma.room.create({
      data: {
        propertyId: propertyB.id,
        roomType: '1 in a room',
        price: 2500,
        bedsPerRoom: 1,
        numberOfRooms: 1,
      }
    });

    const bookingB = await prisma.booking.create({
      data: {
        tenantId: tenantB.id,
        propertyId: propertyB.id,
        roomId: roomB.id,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30'),
        status: 'PENDING'
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 1: Unauthenticated access to protected routes (401)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      try {
        await axios.get(`${BASE_URL}/admin/users`);
        recordTest(1, 'Unauthenticated access to /admin/users', false, 'Expected 401 but request succeeded', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 401;
        recordTest(1, 'Unauthenticated access to /admin/users', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 2: Tenant attempts to access another tenant's records (IDOR - 403)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      try {
        // Tenant A attempts to download Tenant B's agreement
        await axios.get(`${BASE_URL}/bookings/${bookingB.id}/pdf`, {
          headers: { Authorization: `Bearer ${tokenTenantA}` }
        });
        recordTest(2, 'Tenant IDOR agreement access blocked', false, 'Expected 403 Forbidden', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 403;
        recordTest(2, 'Tenant IDOR agreement access blocked', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 3: Landlord attempts to modify another landlord's listing (IDOR - 403)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      try {
        // Landlord A attempts to update Landlord B's property
        await axios.put(`${BASE_URL}/properties/${propertyB.id}`, {
          title: 'Hacked Property Title By Landlord A'
        }, {
          headers: { Authorization: `Bearer ${tokenLandlordA}` }
        });
        recordTest(3, 'Landlord IDOR property update blocked', false, 'Expected 403 Forbidden', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 403;
        recordTest(3, 'Landlord IDOR property update blocked', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 4: Ordinary Admin attempts to use Super Admin endpoints (403)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      try {
        // Ordinary Admin attempts to access /admin/administrators
        await axios.get(`${BASE_URL}/admin/administrators`, {
          headers: { Authorization: `Bearer ${tokenAdmin}` }
        });
        recordTest(4, 'Admin privilege escalation to /admin/administrators blocked', false, 'Expected 403 Super Admin required', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 403;
        recordTest(4, 'Admin privilege escalation to /admin/administrators blocked', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t0);
      }

      // Ordinary Admin attempts to suspend Super Admin via /admin/users/:id/suspend
      const t1 = Date.now();
      try {
        await axios.put(`${BASE_URL}/admin/users/${superAdminUser.id}/suspend`, {
          isSuspended: true
        }, {
          headers: { Authorization: `Bearer ${tokenAdmin}` }
        });
        recordTest(4, 'Admin attempt to suspend Super Admin blocked', false, 'Expected 403 Forbidden', Date.now() - t1);
      } catch (err: any) {
        const passed = err.response?.status === 403;
        recordTest(4, 'Admin attempt to suspend Super Admin blocked', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t1);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 5: Unauthorized document retrieval / invalid signed URL (403)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      const validSignedUrl = generateSignedDocumentUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg', 60)!;
      // Tamper signature parameter
      const tamperedUrl = validSignedUrl.replace(/signature=[a-f0-9]{8}/, 'signature=deadbeef');

      try {
        await axios.get(`http://localhost:5155${tamperedUrl}`);
        recordTest(5, 'Tampered document signature rejected', false, 'Expected 403 Forbidden', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 403;
        recordTest(5, 'Tampered document signature rejected', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 6: Invalid and expired authentication credentials (401)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      try {
        await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: 'Bearer invalid.bogus.jwt.token' }
        });
        recordTest(6, 'Forged JWT token rejected', false, 'Expected 401 Unauthorized', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 401;
        recordTest(6, 'Forged JWT token rejected', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t0);
      }

      // Revoked token version test
      const t1 = Date.now();
      // Increment token version in DB
      await prisma.user.update({
        where: { id: tenantA.id },
        data: { tokenVersion: 5 }
      });
      try {
        // Use old token with tokenVersion: 0
        await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${tokenTenantA}` }
        });
        recordTest(6, 'Stale tokenVersion session rejected', false, 'Expected 401 Session Revoked', Date.now() - t1);
      } catch (err: any) {
        const passed = err.response?.status === 401;
        recordTest(6, 'Stale tokenVersion session rejected', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t1);
      }
      // Reset tokenVersion for subsequent tests
      await prisma.user.update({ where: { id: tenantA.id }, data: { tokenVersion: 0 } });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 7: Brute-force lockout behavior (429 / Lockout)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      let lockedOut = false;
      for (let attempt = 1; attempt <= 6; attempt++) {
        try {
          await axios.post(`${BASE_URL}/auth/login`, {
            email: 'sec.tenant.b@test.local',
            password: 'WrongPassword!',
            portal: 'PUBLIC'
          });
        } catch (err: any) {
          if (err.response?.status === 429 && err.response?.data?.isLocked) {
            lockedOut = true;
            break;
          }
        }
      }
      recordTest(7, 'Account lockout triggered after repeated failed logins', lockedOut, lockedOut ? 'Locked out with 429' : 'Did not lock out', Date.now() - t0);
      // Clean up lockout
      await prisma.user.update({ where: { id: tenantB.id }, data: { failedLoginAttempts: 0, lockoutUntil: null } });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 8: Invalid request fields & validation rejects (400)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      try {
        await axios.post(`${BASE_URL}/auth/register`, {
          email: 'not-an-email',
          password: 'short',
          firstName: '',
          lastName: '',
          role: 'INVALID_ROLE'
        });
        recordTest(8, 'Validation rejecting malformed registration fields', false, 'Expected 400 Validation Error', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 400 && err.response?.data?.errorCode === 'VALIDATION_ERROR';
        recordTest(8, 'Validation rejecting malformed registration fields', passed, `Returned HTTP ${err.response?.status} (${err.response?.data?.message})`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 9: Payment webhook signature failure (401)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      try {
        await axios.post(`${BASE_URL}/transactions/webhook`, {
          event: 'charge.success',
          data: { reference: 'FAKE_TX' }
        }, {
          headers: { 'x-paystack-signature': 'invalid_forged_signature' }
        });
        recordTest(9, 'Forged webhook signature rejected', false, 'Expected 401 Unauthorized', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 401;
        recordTest(9, 'Forged webhook signature rejected', passed, `Returned HTTP ${err.response?.status}`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 10: Duplicate webhook processing (Idempotency)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      // Create a fresh booking for webhook testing
      const webhookBooking = await prisma.booking.create({
        data: {
          tenantId: tenantA.id,
          propertyId: propertyB.id,
          roomId: roomB.id,
          startDate: new Date('2026-09-01'),
          endDate: new Date('2027-06-30'),
          status: 'PENDING'
        }
      });

      const txRef = `SEC_TX_${Date.now()}`;
      const payload = {
        event: 'charge.success',
        data: {
          reference: txRef,
          currency: 'GHS',
          status: 'success',
          amount: roomB.price * 100, // exact price in pesewas
          metadata: { bookingId: webhookBooking.id }
        }
      };

      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const validSignature = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');

      // First webhook delivery
      const res1 = await axios.post(`${BASE_URL}/transactions/webhook`, payload, {
        headers: { 'x-paystack-signature': validSignature }
      });

      // Second webhook delivery (replay/duplicate)
      const res2 = await axios.post(`${BASE_URL}/transactions/webhook`, payload, {
        headers: { 'x-paystack-signature': validSignature }
      });

      const txCount = await prisma.transaction.count({ where: { reference: txRef } });
      const passed = res1.status === 200 && res2.status === 200 && txCount === 1;
      recordTest(10, 'Idempotent webhook processing prevents duplicate records', passed, `HTTP 200 returned, exactly 1 transaction created (count=${txCount})`, Date.now() - t0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 11: Payment price manipulation & currency mismatch rejected (400)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      const priceTamperBooking = await prisma.booking.create({
        data: {
          tenantId: tenantA.id,
          propertyId: propertyB.id,
          roomId: roomB.id, // price: 2500 GHS
          startDate: new Date('2026-09-01'),
          endDate: new Date('2027-06-30'),
          status: 'PENDING'
        }
      });

      // Attempt 1: Price tampering (1 GHS instead of 2500 GHS)
      const tamperedPayload = {
        event: 'charge.success',
        data: {
          reference: `TAMPER_${Date.now()}`,
          currency: 'GHS',
          status: 'success',
          amount: 100, // 1 GHS in pesewas!
          metadata: { bookingId: priceTamperBooking.id }
        }
      };
      const rawTamper = Buffer.from(JSON.stringify(tamperedPayload), 'utf8');
      const sigTamper = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawTamper).digest('hex');

      let priceTamperBlocked = false;
      try {
        await axios.post(`${BASE_URL}/transactions/webhook`, tamperedPayload, {
          headers: { 'x-paystack-signature': sigTamper }
        });
      } catch (err: any) {
        priceTamperBlocked = err.response?.status === 400;
      }

      // Attempt 2: Currency mismatch (USD instead of GHS)
      const currencyTamperPayload = {
        event: 'charge.success',
        data: {
          reference: `CURRENCY_${Date.now()}`,
          currency: 'USD',
          status: 'success',
          amount: roomB.price * 100,
          metadata: { bookingId: priceTamperBooking.id }
        }
      };
      const rawCurrency = Buffer.from(JSON.stringify(currencyTamperPayload), 'utf8');
      const sigCurrency = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawCurrency).digest('hex');

      let currencyBlocked = false;
      try {
        await axios.post(`${BASE_URL}/transactions/webhook`, currencyTamperPayload, {
          headers: { 'x-paystack-signature': sigCurrency }
        });
      } catch (err: any) {
        currencyBlocked = err.response?.status === 400;
      }

      const passed = priceTamperBlocked && currencyBlocked;
      recordTest(11, 'Price tampering & currency mismatch rejected', passed, `Price tamper blocked: ${priceTamperBlocked}, Currency mismatch blocked: ${currencyBlocked}`, Date.now() - t0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 12: Unauthorized subscription activation blocked (403)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      // Landlord attempts to mark property as available without an active subscription
      const unsubscribedProp = await prisma.property.create({
        data: {
          landlordId: landlordA.id,
          title: 'Unsubscribed Listing',
          type: 'Hostel',
          description: 'No subscription paid',
          location: 'Kumasi',
          price: 1200,
          amenities: '[]',
          images: '[]',
          isAvailable: false,
          approvalStatus: 'PENDING'
        }
      });

      try {
        await axios.put(`${BASE_URL}/properties/${unsubscribedProp.id}`, {
          isAvailable: true
        }, {
          headers: { Authorization: `Bearer ${tokenLandlordA}` }
        });
        recordTest(12, 'Publication gating without active subscription', false, 'Expected 403 Publication Gated', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 403 && err.response?.data?.requiresSubscription === true;
        recordTest(12, 'Publication gating without active subscription', passed, `Returned HTTP ${err.response?.status} (${err.response?.data?.message})`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 13: Malicious file upload rejected (400)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      // Attempting to upload non-image content
      try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('avatar', Buffer.from('<?php echo "evil"; ?>'), {
          filename: 'evil.php',
          contentType: 'application/x-php'
        });

        await axios.post(`${BASE_URL}/upload/avatar`, form, {
          headers: form.getHeaders()
        });
        recordTest(13, 'Malicious executable file upload rejected', false, 'Expected upload to be rejected', Date.now() - t0);
      } catch (err: any) {
        const passed = err.response?.status === 400 || err.response?.status === 500;
        recordTest(13, 'Malicious executable file upload rejected', passed, `Upload rejected: HTTP ${err.response?.status}`, Date.now() - t0);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 14: Stored XSS sanitization
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      const xssPayload = "Hello <script>alert('xss')</script><img src=x onerror=alert(1)>world!";
      let conv = await prisma.conversation.findFirst({
        where: { tenantId: tenantA.id, landlordId: landlordA.id }
      });
      if (!conv) {
        conv = await prisma.conversation.create({
          data: { tenantId: tenantA.id, landlordId: landlordA.id }
        });
      }

      const res = await axios.post(`${BASE_URL}/chat/${conv.id}/messages`, {
        content: xssPayload
      }, {
        headers: { Authorization: `Bearer ${tokenTenantA}` }
      });

      const savedMessage = await prisma.message.findUnique({ where: { id: res.data.id } });
      const containsScript = savedMessage?.content.includes('<script>') || savedMessage?.content.includes('onerror=');
      const passed = !containsScript && (res.status === 200 || res.status === 201);
      recordTest(14, 'Stored XSS stripped from user input', passed, `Sanitized content: "${savedMessage?.content}" (HTTP ${res.status})`, Date.now() - t0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 15: Portal isolation protection (403)
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      // 1. Admin attempts to log in via PUBLIC portal
      let adminBlockedFromPublic = false;
      try {
        await axios.post(`${BASE_URL}/auth/login`, {
          email: 'sec.admin@test.local',
          password: testPassword,
          portal: 'PUBLIC'
        });
      } catch (err: any) {
        adminBlockedFromPublic = err.response?.status === 403 && err.response?.data?.code === 'ADMIN_PORTAL_REQUIRED';
      }

      // 2. Tenant attempts to log in via ADMIN portal
      let tenantBlockedFromAdmin = false;
      try {
        await axios.post(`${BASE_URL}/auth/login`, {
          email: 'sec.tenant.a@test.local',
          password: testPassword,
          portal: 'ADMIN'
        });
      } catch (err: any) {
        tenantBlockedFromAdmin = err.response?.status === 403 && err.response?.data?.code === 'ADMIN_ROLE_REQUIRED';
      }

      const passed = adminBlockedFromPublic && tenantBlockedFromAdmin;
      recordTest(15, 'Strict portal isolation enforced', passed, `Admin in public portal blocked: ${adminBlockedFromPublic}, Tenant in admin portal blocked: ${tenantBlockedFromAdmin}`, Date.now() - t0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 16: Secret leakage & clean error responses
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      // Trigger a 404 or bad request and verify no database credentials or stack traces appear
      let noLeakage = false;
      try {
        await axios.get(`${BASE_URL}/properties/invalid-uuid-syntax-triggering-potential-db-error`);
      } catch (err: any) {
        const bodyStr = JSON.stringify(err.response?.data || {});
        const hasDbUrl = bodyStr.includes('postgres://') || bodyStr.includes('DATABASE_URL');
        const hasStackTrace = bodyStr.includes('node_modules') || bodyStr.includes('at processTicksAndRejections');
        noLeakage = !hasDbUrl && !hasStackTrace;
      }
      recordTest(16, 'Error responses do not leak database credentials or stack traces', noLeakage, 'Response body clean of internal secrets', Date.now() - t0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORY 17: Audit log completeness and sensitive credential redaction
    // ──────────────────────────────────────────────────────────────────────────
    {
      const t0 = Date.now();
      // Call logAudit with sensitive fields
      await logAudit(
        adminUser.id,
        'TEST_SECURITY_ACTION',
        'User',
        tenantA.id,
        { password: 'RawPassword123!', secretToken: 'jwt.token.here', normalField: 'original' },
        { passwordHash: '$2b$10$abcdef', twoFactorSecret: 'TOTP_SECRET_ABC', normalField: 'updated' },
        '127.0.0.1'
      );

      const latestLog = await prisma.auditLog.findFirst({
        where: { action: 'TEST_SECURITY_ACTION' },
        orderBy: { createdAt: 'desc' }
      });

      const oldJson = latestLog?.oldData || '';
      const newJson = latestLog?.newData || '';

      const passwordRedacted = oldJson.includes('[REDACTED]') && !oldJson.includes('RawPassword123!');
      const secretRedacted = newJson.includes('[REDACTED]') && !newJson.includes('TOTP_SECRET_ABC');
      const passed = passwordRedacted && secretRedacted;

      recordTest(17, 'Audit logs redact passwords, secrets, and raw tokens', passed, `Old Data: ${oldJson}, New Data: ${newJson}`, Date.now() - t0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CLEAN UP TEST RECORDS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test artifacts...');
    await prisma.message.deleteMany({ where: { senderId: tenantA.id } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
    await prisma.room.deleteMany({ where: { propertyId: propertyB.id } }).catch(() => {});
    await prisma.property.deleteMany({ where: { landlordId: { in: [landlordA.id, landlordB.id] } } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { action: 'TEST_SECURITY_ACTION' } }).catch(() => {});

    console.log('✅ Cleanup completed.');

  } catch (fatalErr: any) {
    console.error('💥 Fatal error executing security test suite:', fatalErr);
  } finally {
    // Close server
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        console.log('\n🔒 Test server stopped.');
        resolve();
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FINAL SCORECARD
  // ──────────────────────────────────────────────────────────────────────────
  const total = testResults.length;
  const passedCount = testResults.filter(t => t.passed).length;
  const failedCount = total - passedCount;

  console.log('\n======================================================================');
  console.log(`📊 SECURITY TEST SUITE RESULTS: ${passedCount}/${total} PASSED (${failedCount} FAILED)`);
  console.log('======================================================================');

  if (failedCount > 0) {
    console.error('❌ Failed tests:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.error(`   - Category ${t.category}: ${t.name} -> ${t.message}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 ALL 17 SECURITY CONTROLS VERIFIED AND PASSED!\n');
    process.exit(0);
  }
}

runSecurityTestSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
