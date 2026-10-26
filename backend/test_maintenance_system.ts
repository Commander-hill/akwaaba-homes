import axios from 'axios';
import prisma from './src/utils/prisma';
import { generateAccessToken } from './src/utils/jwt';

const BASE_URL = 'http://localhost:5000/api';

async function runMaintenanceTests() {
  console.log('======================================================================');
  console.log('🛠️  AKWAABA HOMES — MAINTENANCE MODE INTEGRATION & SECURITY TEST SUITE');
  console.log('======================================================================\n');

  try {
    // 1. Setup test users
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin.maint@akwaaba.test' },
      update: { role: 'SUPER_ADMIN', isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'superadmin.maint@akwaaba.test',
        passwordHash: '$2b$10$FakeHashedPasswordForTestOnly123456789012345678901234',
        firstName: 'Kwame',
        lastName: 'Mensah',
        role: 'SUPER_ADMIN',
      }
    });

    const tenant = await prisma.user.upsert({
      where: { email: 'tenant.maint@akwaaba.test' },
      update: { role: 'TENANT', isSuspended: false, tokenVersion: 0 },
      create: {
        email: 'tenant.maint@akwaaba.test',
        passwordHash: '$2b$10$FakeHashedPasswordForTestOnly123456789012345678901234',
        firstName: 'Abena',
        lastName: 'Osei',
        role: 'TENANT',
      }
    });

    const superAdminToken = generateAccessToken({ id: superAdmin.id, role: superAdmin.role, tokenVersion: 0 });
    const tenantToken = generateAccessToken({ id: tenant.id, role: tenant.role, tokenVersion: 0 });

    const adminClient = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });

    const tenantClient = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${tenantToken}` }
    });

    const publicClient = axios.create({
      baseURL: BASE_URL
    });

    // Test 1: Fetch Admin Config & Operational Context
    console.log('[Test 1] Fetch initial admin maintenance config & blast-radius telemetry...');
    const initRes = await adminClient.get('/v1/admin/config');
    if (!initRes.data.operationalContext || typeof initRes.data.operationalContext.activeBookingsInFlight !== 'number') {
      throw new Error(`Missing operationalContext in /v1/admin/config: ${JSON.stringify(initRes.data)}`);
    }
    console.log(`  ✅ HTTP ${initRes.status} — Current Mode: ${initRes.data.maintenanceMode ? 'ACTIVE' : 'NORMAL'} | In-Flight Bookings: ${initRes.data.operationalContext.activeBookingsInFlight}, Subscribers: ${initRes.data.operationalContext.pendingSubscribersCount}`);

    // Test 2: Activate Maintenance Mode with custom advisory parameters
    console.log('\n[Test 2] Activating Maintenance Mode via PUT /v1/admin/config...');
    const testEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours in future
    const activateRes = await adminClient.put('/v1/admin/config', {
      maintenanceMode: true,
      maintenanceEndTime: testEndTime,
      maintenanceTitle: 'Scheduled System Architecture Upgrade',
      maintenanceMessage: 'AkwaabaHomes is currently conducting routine system database maintenance. All user data is fully preserved.',
      maintenanceScope: 'GLOBAL',
      maintenanceReason: 'Database index re-optimization & server maintenance',
      maintenanceContactEmail: 'ops@akwaabahomes.com',
      maintenanceContactPhone: '+233 24 111 2222',
    });
    console.log(`  ✅ HTTP ${activateRes.status} — Action logged: ${activateRes.data.action}`);

    // Test 3: Public Config Verification
    console.log('\n[Test 3] Verifying public config endpoint reflects maintenance state...');
    const pubConfigRes = await publicClient.get('/v1/config/public');
    if (!pubConfigRes.data.maintenanceMode || pubConfigRes.data.maintenanceTitle !== 'Scheduled System Architecture Upgrade') {
      throw new Error(`Public config mismatch: ${JSON.stringify(pubConfigRes.data)}`);
    }
    console.log(`  ✅ HTTP ${pubConfigRes.status} — Public config verified: Title="${pubConfigRes.data.maintenanceTitle}", Scope="${pubConfigRes.data.maintenanceScope}"`);

    // Test 4: Verify Non-Admin Access is Blocked with HTTP 503 & Retry-After header
    console.log('\n[Test 4] Verifying Tenant & Public requests receive HTTP 503 Service Unavailable...');
    try {
      await tenantClient.get('/v1/bookings/me');
      throw new Error('Tenant request was NOT blocked during maintenance mode!');
    } catch (err: any) {
      if (err.response?.status === 503) {
        const retryAfter = err.response.headers['retry-after'];
        console.log(`  ✅ HTTP 503 received as expected! Code: ${err.response.data.code}, Retry-After: ${retryAfter}s`);
        if (!retryAfter || parseInt(retryAfter, 10) <= 0) {
          throw new Error('Missing or invalid Retry-After header on 503 response!');
        }
      } else {
        throw err;
      }
    }

    // Test 5: Verify Administrator retains bypass access
    console.log('\n[Test 5] Verifying Administrator access is preserved during maintenance...');
    const adminCheckRes = await adminClient.get('/v1/admin/users?limit=5');
    console.log(`  ✅ HTTP ${adminCheckRes.status} — Administrator bypass confirmed!`);

    // Test 6: Verify Maintenance Audit History, Diff Snapshots & Search/Filter
    console.log('\n[Test 6] Verifying Maintenance Audit History endpoint (action filter + search + oldData/newData diffs)...');
    const historyRes = await adminClient.get('/v1/admin/maintenance/history?action=MAINTENANCE_ACTIVATED&search=re-optimization');
    const logs = historyRes.data.history || [];
    const latestEvent = logs[0];
    if (!latestEvent || latestEvent.action !== 'MAINTENANCE_ACTIVATED') {
      throw new Error(`Filtered audit query did not return MAINTENANCE_ACTIVATED record: ${JSON.stringify(historyRes.data)}`);
    }
    console.log(`  ✅ Found ${logs.length} matching audit records. Latest event: [${latestEvent?.action}] by ${latestEvent?.user?.email || 'Admin'}`);

    // Test 7: Deactivate Maintenance Mode
    console.log('\n[Test 7] Deactivating Maintenance Mode & restoring public access...');
    const deactRes = await adminClient.put('/v1/admin/config', {
      maintenanceMode: false,
      maintenanceEndTime: null,
      maintenanceScheduled: false
    });
    console.log(`  ✅ HTTP ${deactRes.status} — Action logged: ${deactRes.data.action}`);

    // Test 8: Verify Tenant can now access endpoints normally
    console.log('\n[Test 8] Verifying Tenant request succeeds after deactivation...');
    const tenantRestoredRes = await tenantClient.get('/v1/bookings/me');
    console.log(`  ✅ HTTP ${tenantRestoredRes.status} — Public services fully restored!`);

    console.log('\n======================================================================');
    console.log('🎉 ALL 8 MAINTENANCE TESTS PASSED COMPLETELY!');
    console.log('======================================================================\n');
  } catch (error: any) {
    console.error('\n❌ Maintenance Test Suite Failed:', error.response?.data || error.message || error);
    process.exit(1);
  } finally {
    // Ensure maintenance mode is always reset to false in database
    await prisma.systemConfig.updateMany({
      where: { id: 'GLOBAL' },
      data: { maintenanceMode: false, maintenanceEndTime: null, maintenanceScheduled: false }
    });
  }
}

runMaintenanceTests();
