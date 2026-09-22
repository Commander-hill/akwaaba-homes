import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('--- STARTING BOOKING STATE MACHINE & CONCURRENCY TESTS ---');

  // 1. Setup Test Users with complete profile, student fields, and verified Ghana Card
  const landlordEmail = 'test_landlord_sm@example.com';
  const tenant1Email = 'test_tenant1_sm@example.com';
  const tenant2Email = 'test_tenant2_sm@example.com';
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const landlord = await prisma.user.upsert({
    where: { email: landlordEmail },
    update: { 
      passwordHash, 
      isEmailVerified: true, 
      role: 'LANDLORD',
      firstName: 'Landlord',
      lastName: 'Tester',
      phoneNumber: '0240000000'
    },
    create: {
      email: landlordEmail,
      passwordHash,
      firstName: 'Landlord',
      lastName: 'Tester',
      role: 'LANDLORD',
      isEmailVerified: true,
      phoneNumber: '0240000000'
    }
  });

  const tenant1 = await prisma.user.upsert({
    where: { email: tenant1Email },
    update: { 
      passwordHash, 
      isEmailVerified: true, 
      role: 'TENANT',
      firstName: 'TenantOne',
      lastName: 'Tester',
      phoneNumber: '0241111111',
      gender: 'MALE',
      dateOfBirth: '2000-01-01',
      nationality: 'Ghanaian',
      campus: 'KNUST',
      studentId: 'KNUST-2023-001',
      dateOfAdmission: '2022-09-01',
      programmeOfStudy: 'BSc Computer Science',
      yearOfStudy: '3',
      studentType: 'REGULAR',
      guardianName: 'Guardian Alpha',
      guardianPhone: '0249999991',
      ghanaCardStatus: 'VERIFIED',
      ghanaCardNumber: 'GHA-000000001-1'
    },
    create: {
      email: tenant1Email,
      passwordHash,
      firstName: 'TenantOne',
      lastName: 'Tester',
      role: 'TENANT',
      isEmailVerified: true,
      phoneNumber: '0241111111',
      gender: 'MALE',
      dateOfBirth: '2000-01-01',
      nationality: 'Ghanaian',
      campus: 'KNUST',
      studentId: 'KNUST-2023-001',
      dateOfAdmission: '2022-09-01',
      programmeOfStudy: 'BSc Computer Science',
      yearOfStudy: '3',
      studentType: 'REGULAR',
      guardianName: 'Guardian Alpha',
      guardianPhone: '0249999991',
      ghanaCardStatus: 'VERIFIED',
      ghanaCardNumber: 'GHA-000000001-1'
    }
  });

  const tenant2 = await prisma.user.upsert({
    where: { email: tenant2Email },
    update: { 
      passwordHash, 
      isEmailVerified: true, 
      role: 'TENANT',
      firstName: 'TenantTwo',
      lastName: 'Tester',
      phoneNumber: '0242222222',
      gender: 'MALE',
      dateOfBirth: '2000-01-01',
      nationality: 'Ghanaian',
      campus: 'KNUST',
      studentId: 'KNUST-2023-002',
      dateOfAdmission: '2022-09-01',
      programmeOfStudy: 'BSc Computer Science',
      yearOfStudy: '3',
      studentType: 'REGULAR',
      guardianName: 'Guardian Beta',
      guardianPhone: '0249999992',
      ghanaCardStatus: 'VERIFIED',
      ghanaCardNumber: 'GHA-000000002-2'
    },
    create: {
      email: tenant2Email,
      passwordHash,
      firstName: 'TenantTwo',
      lastName: 'Tester',
      role: 'TENANT',
      isEmailVerified: true,
      phoneNumber: '0242222222',
      gender: 'MALE',
      dateOfBirth: '2000-01-01',
      nationality: 'Ghanaian',
      campus: 'KNUST',
      studentId: 'KNUST-2023-002',
      dateOfAdmission: '2022-09-01',
      programmeOfStudy: 'BSc Computer Science',
      yearOfStudy: '3',
      studentType: 'REGULAR',
      guardianName: 'Guardian Beta',
      guardianPhone: '0249999992',
      ghanaCardStatus: 'VERIFIED',
      ghanaCardNumber: 'GHA-000000002-2'
    }
  });

  // Setup Test Property, Room, RoomUnit & Bed
  const property = await prisma.property.create({
    data: {
      title: 'State Machine Test Hostel',
      type: 'Hostel',
      description: 'Hostel for concurrency and state machine automated tests',
      price: 1500,
      location: 'Ayeduase, KNUST',
      targetAudience: 'Students Only',
      amenities: JSON.stringify(['WiFi', 'Water']),
      images: JSON.stringify(['/test.jpg']),
      landlordId: landlord.id,
      approvalStatus: 'APPROVED',
      isAvailable: true
    }
  });

  // Create active subscription for the property to pass booking gating
  const subEndDate = new Date();
  subEndDate.setFullYear(subEndDate.getFullYear() + 1);
  await prisma.propertySubscription.create({
    data: {
      propertyId: property.id,
      paymentReference: `TEST-SUB-${Date.now()}`,
      paymentStatus: 'COMPLETED',
      isActive: true,
      startDate: new Date(),
      endDate: subEndDate
    }
  });

  const room = await prisma.room.create({
    data: {
      propertyId: property.id,
      roomType: '1 in a room',
      gender: 'MALE',
      price: 1500,
      numberOfRooms: 1,
      bedsPerRoom: 1
    }
  });

  const roomUnit = await prisma.roomUnit.create({
    data: {
      roomId: room.id,
      unitNumber: 'RM-SM-101',
      floor: 1,
      bedsPerRoom: 1
    }
  });

  const bed = await prisma.bed.create({
    data: {
      roomUnitId: roomUnit.id,
      bedNumber: 'Bed-1',
      status: 'AVAILABLE'
    }
  });

  console.log(`[SETUP] Created test fixtures: Property ${property.id}, Room ${room.id}, Unit ${roomUnit.id}, Bed ${bed.id}`);

  // Authenticate users
  const landlordLoginRes = await axios.post(`${API_URL}/auth/login`, { email: landlordEmail, password });
  const landlordToken = landlordLoginRes.data.accessToken;

  const tenant1LoginRes = await axios.post(`${API_URL}/auth/login`, { email: tenant1Email, password });
  const tenant1Token = tenant1LoginRes.data.accessToken;

  const tenant2LoginRes = await axios.post(`${API_URL}/auth/login`, { email: tenant2Email, password });
  const tenant2Token = tenant2LoginRes.data.accessToken;

  console.log('[AUTH] All test accounts successfully authenticated.');

  const tenant1Api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${tenant1Token}` }
  });

  const tenant2Api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${tenant2Token}` }
  });

  const landlordApi = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${landlordToken}` }
  });

  let bookingId: string = '';
  let cancelBookingId: string = '';

  try {
    // TEST 1: Concurrency Race Condition (Two tenants attempting to book the same bed concurrently)
    console.log('\n[TEST 1] Concurrent booking test on the exact same bed...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);

    const [res1, res2] = await Promise.allSettled([
      tenant1Api.post('/bookings', {
        propertyId: property.id,
        roomId: room.id,
        roomUnitId: roomUnit.id,
        bedId: bed.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }),
      tenant2Api.post('/bookings', {
        propertyId: property.id,
        roomId: room.id,
        roomUnitId: roomUnit.id,
        bedId: bed.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    ]);

    const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
    const rejected = [res1, res2].filter((r) => r.status === 'rejected');

    console.log(`Concurrency result: ${fulfilled.length} succeeded, ${rejected.length} rejected.`);
    if (fulfilled.length === 1 && rejected.length === 1) {
      console.log('✅ TEST 1 PASSED: Exactly 1 concurrent request succeeded, and 1 was blocked with conflict!');
    } else {
      console.error('Test 1 responses:', JSON.stringify({
        res1: res1.status === 'fulfilled' ? res1.value.data : (res1 as any).reason?.response?.data,
        res2: res2.status === 'fulfilled' ? res2.value.data : (res2 as any).reason?.response?.data,
      }));
      throw new Error(`TEST 1 FAILED: Expected 1 success and 1 conflict, got ${fulfilled.length} and ${rejected.length}`);
    }

    const successfulBooking = (fulfilled[0] as PromiseFulfilledResult<any>).value.data.booking;
    bookingId = successfulBooking.id;

    // Verify Bed status is now RESERVED
    const bedAfterBooking = await prisma.bed.findUnique({ where: { id: bed.id } });
    console.log(`Bed status after booking: ${bedAfterBooking?.status}`);
    if (bedAfterBooking?.status === 'RESERVED') {
      console.log('✅ Bed marked as RESERVED atomically.');
    } else {
      throw new Error(`Bed should be RESERVED, but found ${bedAfterBooking?.status}`);
    }

    // TEST 2: Overlapping Date Block
    console.log('\n[TEST 2] Testing overlapping date rejection on reserved bed...');
    try {
      await tenant2Api.post('/bookings', {
        propertyId: property.id,
        roomId: room.id,
        roomUnitId: roomUnit.id,
        bedId: bed.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      throw new Error('TEST 2 FAILED: Overlapping booking was not rejected!');
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 409) {
        console.log(`✅ TEST 2 PASSED: Overlapping reservation blocked (${err.response.status}: ${err.response.data?.message})`);
      } else {
        throw err;
      }
    }

    // TEST 3: State Machine: PENDING -> APPROVED
    console.log('\n[TEST 3] Landlord approving booking (PENDING -> APPROVED)...');
    const approveRes = await landlordApi.put(`/bookings/${bookingId}/status`, { status: 'APPROVED' });
    console.log(`Approve response: ${approveRes.data.message}`);
    if (approveRes.data.booking.status === 'APPROVED') {
      console.log('✅ TEST 3 PASSED: Booking is now APPROVED.');
    } else {
      throw new Error(`Expected APPROVED, got ${approveRes.data.booking.status}`);
    }

    // TEST 4: Invalid Transition Matrix Guard (APPROVED -> COMPLETED directly should fail)
    console.log('\n[TEST 4] Testing invalid transition guard (APPROVED -> COMPLETED directly)...');
    try {
      await landlordApi.put(`/bookings/${bookingId}/status`, { status: 'COMPLETED' });
      throw new Error('TEST 4 FAILED: Invalid direct transition was allowed!');
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        console.log(`✅ TEST 4 PASSED: Invalid state transition rejected (${err.response.status}: ${err.response.data?.message})`);
      } else {
        throw err;
      }
    }

    // TEST 5: State Machine: APPROVED -> CONFIRMED -> CHECKED_IN
    console.log('\n[TEST 5] Advancing state machine: APPROVED -> CONFIRMED...');
    const confirmRes = await landlordApi.put(`/bookings/${bookingId}/status`, { status: 'CONFIRMED' });
    if (confirmRes.data.booking.status !== 'CONFIRMED') {
      throw new Error(`Expected CONFIRMED, got ${confirmRes.data.booking.status}`);
    }
    console.log('✅ Booking confirmed.');

    console.log('Advancing state machine: CONFIRMED -> CHECKED_IN...');
    const checkinRes = await landlordApi.put(`/bookings/${bookingId}/status`, { status: 'CHECKED_IN' });
    if (checkinRes.data.booking.status !== 'CHECKED_IN') {
      throw new Error(`Expected CHECKED_IN, got ${checkinRes.data.booking.status}`);
    }
    console.log('✅ Booking checked in.');

    // Verify Bed is now OCCUPIED
    const bedAfterCheckin = await prisma.bed.findUnique({ where: { id: bed.id } });
    if (bedAfterCheckin?.status === 'OCCUPIED') {
      console.log('✅ TEST 5 PASSED: Bed marked OCCUPIED on check-in.');
    } else {
      throw new Error(`Expected bed OCCUPIED, got ${bedAfterCheckin?.status}`);
    }

    // TEST 6: State Machine: CHECKED_IN -> COMPLETED (Tenancy completed, bed released to AVAILABLE)
    console.log('\n[TEST 6] Completing booking: CHECKED_IN -> COMPLETED...');
    const completeRes = await landlordApi.put(`/bookings/${bookingId}/status`, { status: 'COMPLETED' });
    if (completeRes.data.booking.status !== 'COMPLETED') {
      throw new Error(`Expected COMPLETED, got ${completeRes.data.booking.status}`);
    }
    const bedAfterComplete = await prisma.bed.findUnique({ where: { id: bed.id } });
    if (bedAfterComplete?.status === 'AVAILABLE') {
      console.log('✅ TEST 6 PASSED: Bed released to AVAILABLE upon booking completion.');
    } else {
      throw new Error(`Expected bed AVAILABLE, got ${bedAfterComplete?.status}`);
    }

    // TEST 7: Tenant Cancellation & Bed Release
    console.log('\n[TEST 7] Tenant booking and cancellation test...');
    // Tenant 2 creates a new booking on bed
    const newBookingRes = await tenant2Api.post('/bookings', {
      propertyId: property.id,
      roomId: room.id,
      roomUnitId: roomUnit.id,
      bedId: bed.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    cancelBookingId = newBookingRes.data.booking.id;

    const bedAfterNewBooking = await prisma.bed.findUnique({ where: { id: bed.id } });
    if (bedAfterNewBooking?.status !== 'RESERVED') {
      throw new Error(`Expected bed RESERVED, got ${bedAfterNewBooking?.status}`);
    }

    // Tenant cancels pending booking
    const cancelRes = await tenant2Api.post(`/bookings/${cancelBookingId}/cancel`);
    if (cancelRes.data.booking.status !== 'CANCELLED') {
      throw new Error(`Expected CANCELLED, got ${cancelRes.data.booking.status}`);
    }
    const bedAfterCancel = await prisma.bed.findUnique({ where: { id: bed.id } });
    if (bedAfterCancel?.status === 'AVAILABLE') {
      console.log('✅ TEST 7 PASSED: Tenant cancellation released bed back to AVAILABLE.');
    } else {
      throw new Error(`Expected bed AVAILABLE, got ${bedAfterCancel?.status}`);
    }

    // TEST 8: Audit Log Verification
    console.log('\n[TEST 8] Verifying AuditLog entries...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: { in: [bookingId, cancelBookingId] }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Recorded audit logs count: ${auditLogs.length}`);
    const actions = auditLogs.map((l) => l.action);
    console.log('Audit actions recorded:', actions);

    const hasCreate = actions.includes('CREATE_BOOKING');
    const hasUpdate = actions.includes('UPDATE_BOOKING_STATUS');
    const hasCancel = actions.includes('CANCEL_BOOKING');

    if (hasCreate && hasUpdate && hasCancel) {
      console.log('✅ TEST 8 PASSED: All audit trail actions (CREATE, UPDATE, CANCEL) recorded in database.');
    } else {
      throw new Error(`Missing expected audit logs: hasCreate=${hasCreate}, hasUpdate=${hasUpdate}, hasCancel=${hasCancel}`);
    }

    console.log('\n🎉 ALL BOOKING STATE MACHINE & CONCURRENCY TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Cleanup test records
    console.log('\n[CLEANUP] Cleaning up test records...');
    const idsToDelete = [bookingId, cancelBookingId].filter(Boolean);
    if (idsToDelete.length > 0) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: idsToDelete } } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { id: { in: idsToDelete } } }).catch(() => {});
    }
    await prisma.notification.deleteMany({ where: { userId: { in: [landlord.id, tenant1.id, tenant2.id] } } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomUnitId: roomUnit.id } }).catch(() => {});
    await prisma.roomUnit.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.deleteMany({ where: { propertyId: property.id } }).catch(() => {});
    await prisma.propertySubscription.deleteMany({ where: { propertyId: property.id } }).catch(() => {});
    await prisma.property.deleteMany({ where: { id: property.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [landlord.id, tenant1.id, tenant2.id] } } }).catch(() => {});
    console.log('[CLEANUP] Completed.');
  }
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
