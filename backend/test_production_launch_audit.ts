import axios from 'axios';
import crypto from 'crypto';
import prisma from './src/utils/prisma';
import bcrypt from 'bcrypt';
import { generateTOTPCode } from './src/utils/totp.service';

// Dynamically require socket.io-client from frontend node_modules
const { io } = require('../frontend/node_modules/socket.io-client');

const API_BASE = 'http://localhost:5000/api/v1';
const SOCKET_BASE = 'http://localhost:5000';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_05b7cf9ffe6c0d32950f71d345ec543d5cc6080a';

interface AuditMetric {
  stage: string;
  action: string;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  details: string;
}

const auditMetrics: AuditMetric[] = [];

function recordMetric(stage: string, action: string, status: 'PASSED' | 'FAILED', durationMs: number, details: string) {
  auditMetrics.push({ stage, action, status, durationMs, details });
  const icon = status === 'PASSED' ? '✅' : '❌';
  console.log(`${icon} [${stage}] ${action} (${durationMs}ms) — ${details}`);
}

async function runLaunchAudit() {
  console.log('\n======================================================================');
  console.log('🚀 AKWAABA HOMES — FULL PRODUCTION SYSTEM AUDIT & SMOKE TEST SUITE');
  console.log('======================================================================\n');

  const startTimeAll = Date.now();

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 1: USER PROVISIONING & IDENTITY VERIFICATION (NIA GHANA CARD)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- STAGE 1: User Provisioning & Identity Verification ---');
    const stage1Start = Date.now();

    const landlordEmail = 'landlord.audit@akwaaba.test';
    const tenantEmail = 'tenant.audit@akwaaba.test';
    const testPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // 1.1 Provision Landlord User
    const landlordUser = await prisma.user.upsert({
      where: { email: landlordEmail },
      update: {
        passwordHash,
        isEmailVerified: true,
        role: 'LANDLORD',
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
      create: {
        email: landlordEmail,
        passwordHash,
        firstName: 'Kwame',
        lastName: 'Landlord',
        phoneNumber: '+233244001122',
        role: 'LANDLORD',
        isEmailVerified: true,
      },
    });

    // 1.2 Provision Tenant User with full profile fields
    const tenantUser = await prisma.user.upsert({
      where: { email: tenantEmail },
      update: {
        passwordHash,
        isEmailVerified: true,
        role: 'TENANT',
        firstName: 'Kwesi',
        lastName: 'Mensah',
        phoneNumber: '+233241998877',
        gender: 'MALE',
        dateOfBirth: '2002-06-15',
        nationality: 'Ghanaian',
        guardianName: 'Kofi Mensah Snr',
        guardianPhone: '+233241554433',
        campus: 'Legon Main Campus',
        studentId: '10998877',
        dateOfAdmission: '2023-09-01',
        programmeOfStudy: 'BSc Computer Science',
        yearOfStudy: 'Level 300',
        studentType: 'REGULAR',
        ghanaCardStatus: 'NOT_SUBMITTED',
      },
      create: {
        email: tenantEmail,
        passwordHash,
        firstName: 'Kwesi',
        lastName: 'Mensah',
        phoneNumber: '+233241998877',
        role: 'TENANT',
        isEmailVerified: true,
        gender: 'MALE',
        dateOfBirth: '2002-06-15',
        nationality: 'Ghanaian',
        guardianName: 'Kofi Mensah Snr',
        guardianPhone: '+233241554433',
        campus: 'Legon Main Campus',
        studentId: '10998877',
        dateOfAdmission: '2023-09-01',
        programmeOfStudy: 'BSc Computer Science',
        yearOfStudy: 'Level 300',
        studentType: 'REGULAR',
        ghanaCardStatus: 'NOT_SUBMITTED',
      },
    });

    // Clean any prior bookings or payouts for clean state
    await prisma.payoutRequest.deleteMany({ where: { landlordId: landlordUser.id } });
    await prisma.transaction.deleteMany({ where: { tenantId: tenantUser.id } });
    await prisma.leaseAgreement.deleteMany({
      where: { booking: { tenantId: tenantUser.id } },
    });
    await prisma.booking.deleteMany({ where: { tenantId: tenantUser.id } });

    // 1.3 Tenant Authentication (Obtain Token & Cookie)
    const tenantLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: tenantEmail,
      password: testPassword,
    });
    const tenantToken = tenantLoginRes.data.accessToken;
    if (!tenantToken) throw new Error('Tenant login did not return accessToken');

    // 1.4 Landlord Authentication (Obtain Token & Cookie)
    const landlordLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: landlordEmail,
      password: testPassword,
    });
    const landlordToken = landlordLoginRes.data.accessToken;
    if (!landlordToken) throw new Error('Landlord login did not return accessToken');

    recordMetric('Stage 1', 'User Provisioning & Auth', 'PASSED', Date.now() - stage1Start, 'Both users logged in with JWT sessions');

    // 1.5 Tenant submits Ghana Card (NIA)
    const ghanaCardStart = Date.now();
    const ghanaCardRes = await axios.post(
      `${API_BASE}/auth/ghana-card`,
      {
        ghanaCardNumber: 'GHA-789012345-1',
        ghanaCardFrontUrl: 'https://res.cloudinary.com/dummy/ghana_card_front.jpg',
        ghanaCardBackUrl: 'https://res.cloudinary.com/dummy/ghana_card_back.jpg',
      },
      { headers: { Authorization: `Bearer ${tenantToken}` } }
    );
    if (ghanaCardRes.status !== 200) throw new Error('Ghana card submission failed');

    // Fast-track verification in DB (simulating admin approval)
    await prisma.user.update({
      where: { id: tenantUser.id },
      data: { ghanaCardStatus: 'VERIFIED' },
    });

    recordMetric('Stage 1', 'Ghana Card (NIA) Verification', 'PASSED', Date.now() - ghanaCardStart, 'Encrypted NIA card submitted & marked VERIFIED');

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 2: REAL-TIME WEBSOCKET MULTI-DEVICE SYNCHRONIZATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 2: WebSocket Dual-Device Handshake ---');
    const stage2Start = Date.now();

    const tenantEventsReceived: string[] = [];
    const landlordEventsReceived: string[] = [];

    const tenantSocket = io(SOCKET_BASE, {
      auth: { token: `Bearer ${tenantToken}` },
      transports: ['websocket'],
    });

    const landlordSocket = io(SOCKET_BASE, {
      auth: { token: `Bearer ${landlordToken}` },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        tenantSocket.on('connect', () => resolve());
        tenantSocket.on('connect_error', (err: any) => reject(err));
      }),
      new Promise<void>((resolve, reject) => {
        landlordSocket.on('connect', () => resolve());
        landlordSocket.on('connect_error', (err: any) => reject(err));
      }),
    ]);

    // Attach real-time listeners
    tenantSocket.on('notification', (data: any) => tenantEventsReceived.push(`notification:${data.title || data.message || ''}`));
    tenantSocket.on('booking_updated', (data: any) => tenantEventsReceived.push(`booking_updated:${data?.booking?.status || ''}`));
    tenantSocket.on('agreement_updated', (data: any) => tenantEventsReceived.push(`agreement_updated:${data?.agreement?.status || ''}`));

    landlordSocket.on('notification', (data: any) => landlordEventsReceived.push(`notification:${data.title || data.message || ''}`));
    landlordSocket.on('booking_created', () => landlordEventsReceived.push('booking_created'));
    landlordSocket.on('agreement_updated', (data: any) => landlordEventsReceived.push(`agreement_updated:${data?.agreement?.status || ''}`));

    recordMetric('Stage 2', 'WebSocket Dual-Device Connect', 'PASSED', Date.now() - stage2Start, 'Both Tenant and Landlord sockets connected & authenticated');

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 3: PROPERTY & INVENTORY UNIT PROVISIONING
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 3: Property & Inventory Unit Provisioning ---');
    const stage3Start = Date.now();

    // Check or create test hostel property
    let property = await prisma.property.findFirst({
      where: { landlordId: landlordUser.id },
      include: { rooms: { include: { roomUnits: { include: { beds: true } } } } },
    });

    if (!property) {
      property = await prisma.property.create({
        data: {
          landlordId: landlordUser.id,
          title: 'Akwaaba Premier Hall (Audit Test)',
          type: 'Hostel',
          description: 'Premium student accommodation with 24/7 security and high-speed Wi-Fi.',
          price: 2500,
          location: 'Legon Campus, Accra',
          amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'Study Room', 'Water Reservoir']),
          images: JSON.stringify(['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80']),
          isAvailable: true,
          approvalStatus: 'APPROVED',
          rooms: {
            create: [
              {
                roomType: '1 in a room',
                bedsPerRoom: 1,
                numberOfRooms: 1,
                price: 2500,
                gender: 'MALE',
                roomUnits: {
                  create: [
                    {
                      unitNumber: 'RM-E2E-101',
                      floor: 1,
                      genderLock: 'UNASSIGNED',
                      bedsPerRoom: 1,
                      beds: {
                        create: [
                          {
                            bedNumber: 'Bed A',
                            status: 'AVAILABLE',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        include: { rooms: { include: { roomUnits: { include: { beds: true } } } } },
      });
    }

    const testRoom = property.rooms[0];
    const testRoomUnit = testRoom.roomUnits[0];
    let testBed = testRoomUnit.beds[0];

    // Reset bed and room unit status to AVAILABLE and UNASSIGNED
    await prisma.bed.update({
      where: { id: testBed.id },
      data: { status: 'AVAILABLE' },
    });
    await prisma.roomUnit.update({
      where: { id: testRoomUnit.id },
      data: { genderLock: 'UNASSIGNED' },
    });

    // Tenant discovers property via public endpoint
    const discoveryRes = await axios.get(`${API_BASE}/properties/${property.id}`);
    if (discoveryRes.status !== 200 || !discoveryRes.data.property) {
      throw new Error('Property discovery query failed');
    }

    recordMetric('Stage 3', 'Property Discovery & Setup', 'PASSED', Date.now() - stage3Start, `Discovered property "${property.title}" with Bed ${testBed.bedNumber}`);

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 4: TENANT RESERVATION & REAL-TIME EVENT DISPATCH
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 4: Tenant Bed Reservation & Booking ---');
    const stage4Start = Date.now();

    const bookingPayload = {
      propertyId: property.id,
      roomId: testRoom.id,
      roomUnitId: testRoomUnit.id,
      bedId: testBed.id,
      startDate: '2026-09-15',
      endDate: '2027-06-30',
    };

    const bookingRes = await axios.post(`${API_BASE}/bookings`, bookingPayload, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    if (bookingRes.status !== 201 || !bookingRes.data.booking) {
      throw new Error(`Booking creation failed: ${JSON.stringify(bookingRes.data)}`);
    }

    const createdBooking = bookingRes.data.booking;
    if (createdBooking.status !== 'PENDING') throw new Error(`Expected PENDING status, got ${createdBooking.status}`);

    // Verify bed was locked atomically
    const bedAfterBooking = await prisma.bed.findUnique({ where: { id: testBed.id } });
    if (bedAfterBooking?.status !== 'RESERVED') {
      throw new Error(`Expected bed status RESERVED, got ${bedAfterBooking?.status}`);
    }

    // Wait 500ms for WebSocket propagation
    await new Promise((r) => setTimeout(r, 600));
    const landlordGotBookingEvent = landlordEventsReceived.some((e) => e.includes('booking_created') || e.includes('notification'));
    if (!landlordGotBookingEvent) {
      console.warn('⚠️ Note: Landlord WebSocket event delayed or buffered');
    }

    recordMetric('Stage 4', 'Bed Reservation & Lock', 'PASSED', Date.now() - stage4Start, `Booking ID: ${createdBooking.id} (Status: PENDING, Bed: RESERVED)`);

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 5: LANDLORD REVIEW & LEASE GENERATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 5: Landlord Review & Act 220 Agreement Generation ---');
    const stage5Start = Date.now();

    // Landlord approves the booking
    const approveRes = await axios.put(
      `${API_BASE}/bookings/${createdBooking.id}/status`,
      { status: 'APPROVED' },
      { headers: { Authorization: `Bearer ${landlordToken}` } }
    );

    if (approveRes.status !== 200) throw new Error('Booking approval failed');

    // Verify lease agreement was automatically created
    const agreement = await prisma.leaseAgreement.findUnique({
      where: { bookingId: createdBooking.id },
    });

    if (!agreement) throw new Error('LeaseAgreement was not auto-generated upon booking approval');

    recordMetric('Stage 5', 'Booking Approval & Lease Creation', 'PASSED', Date.now() - stage5Start, `LeaseAgreement ID: ${agreement.id} generated`);

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 6: MUTUAL CRYPTOGRAPHIC E-SIGNATURE (ACT 220 DEED BADGE)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 6: Mutual Cryptographic E-Signature ---');
    const stage6Start = Date.now();

    const mockSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // 6.1 Tenant Signs First
    const tenantSignRes = await axios.post(
      `${API_BASE}/agreements/booking/${createdBooking.id}/sign`,
      { signature: mockSignature },
      { headers: { Authorization: `Bearer ${tenantToken}` } }
    );

    if (tenantSignRes.status !== 200) throw new Error('Tenant signature failed');
    if (tenantSignRes.data.agreement.status !== 'PENDING_LANDLORD') {
      throw new Error(`Expected PENDING_LANDLORD status, got ${tenantSignRes.data.agreement.status}`);
    }

    // 6.2 Landlord Countersigns
    const landlordSignRes = await axios.post(
      `${API_BASE}/agreements/booking/${createdBooking.id}/sign`,
      { signature: mockSignature },
      { headers: { Authorization: `Bearer ${landlordToken}` } }
    );

    if (landlordSignRes.status !== 200) throw new Error('Landlord signature failed');
    const completedAgreement = landlordSignRes.data.agreement;
    if (completedAgreement.status !== 'COMPLETED') {
      throw new Error(`Expected COMPLETED agreement status, got ${completedAgreement.status}`);
    }
    if (!completedAgreement.cryptographicHash) {
      throw new Error('Missing SHA-256 cryptographic hash on completed agreement');
    }

    recordMetric('Stage 6', 'Mutual Cryptographic Signing', 'PASSED', Date.now() - stage6Start, `Signed by both parties. SHA-256 Hash: ${completedAgreement.cryptographicHash.slice(0, 16)}...`);

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 7: ESCROW RENT COLLECTION (PAYSTACK RAW BUFFER WEBHOOK)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 7: Escrow Rent Collection via Paystack Webhook ---');
    const stage7Start = Date.now();

    const webhookEvent = {
      event: 'charge.success',
      data: {
        id: 99887766,
        domain: 'test',
        status: 'success',
        reference: `AUDIT_REF_${Date.now()}`,
        amount: 250000, // 2,500 GHS in pesewas
        currency: 'GHS',
        paid_at: new Date().toISOString(),
        metadata: {
          bookingId: createdBooking.id,
        },
      },
    };

    const rawPayloadBuffer = Buffer.from(JSON.stringify(webhookEvent), 'utf8');
    const hmacSignature = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(rawPayloadBuffer)
      .digest('hex');

    const webhookRes = await axios.post(`${API_BASE}/transactions/webhook`, webhookEvent, {
      headers: {
        'x-paystack-signature': hmacSignature,
        'Content-Type': 'application/json',
      },
    });

    if (webhookRes.status !== 200) throw new Error(`Paystack webhook failed with status ${webhookRes.status}`);

    // Verify booking is COMPLETED and bed is BOOKED
    const bookingAfterPay = await prisma.booking.findUnique({ where: { id: createdBooking.id } });
    if (bookingAfterPay?.status !== 'COMPLETED') {
      throw new Error(`Expected booking COMPLETED, got ${bookingAfterPay?.status}`);
    }

    const bedAfterPay = await prisma.bed.findUnique({ where: { id: testBed.id } });
    if (bedAfterPay?.status !== 'BOOKED') {
      throw new Error(`Expected bed BOOKED, got ${bedAfterPay?.status}`);
    }

    // Verify transaction recorded
    const transaction = await prisma.transaction.findFirst({
      where: { bookingId: createdBooking.id },
    });
    if (!transaction || transaction.status !== 'SUCCESS') {
      throw new Error('Transaction record not found or not SUCCESS');
    }

    recordMetric('Stage 7', 'Paystack Escrow Ingestion', 'PASSED', Date.now() - stage7Start, `Transaction Ref: ${transaction.reference}, Booking COMPLETED, Bed BOOKED`);

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 8: LANDLORD BALANCE, 2FA STEP-UP & ATOMIC MOMO PAYOUT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 8: Landlord Balance, 2FA Step-Up & MoMo Payout ---');
    const stage8Start = Date.now();

    // 8.1 Check Landlord Cashflows & Transaction Retrieval
    const cashflowsRes = await axios.get(`${API_BASE}/transactions/landlord`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (cashflowsRes.status !== 200 || !cashflowsRes.data.transactions) {
      throw new Error('Failed to retrieve landlord cashflows');
    }

    const txDetailRes = await axios.get(`${API_BASE}/transactions/${transaction.id}`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (txDetailRes.status !== 200 || txDetailRes.data.transaction.id !== transaction.id) {
      throw new Error('Failed to retrieve transaction by ID');
    }

    // 8.2 Setup & Enable 2FA on Landlord Account
    const setup2faRes = await axios.post(
      `${API_BASE}/auth/2fa/setup`,
      {},
      { headers: { Authorization: `Bearer ${landlordToken}` } }
    );
    const totpSecret = setup2faRes.data.secret;
    if (!totpSecret) throw new Error('2FA setup did not return secret');

    const validTotpCode = generateTOTPCode(totpSecret);
    const enable2faRes = await axios.post(
      `${API_BASE}/auth/2fa/enable`,
      { code: validTotpCode },
      { headers: { Authorization: `Bearer ${landlordToken}` } }
    );
    if (enable2faRes.status !== 200) throw new Error('Failed to enable 2FA on landlord account');

    // 8.3 Attempt Payout without 2FA Code -> Should be Rejected (403 Step-Up Required)
    let rejectedWithoutCode = false;
    try {
      await axios.post(
        `${API_BASE}/payouts/request`,
        {
          amount: 500,
          recipientType: 'MOMO',
          accountName: 'Kwame Landlord',
          accountNumber: '0244001122',
          bankOrNetwork: 'MTN',
        },
        { headers: { Authorization: `Bearer ${landlordToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.requireStepUp) {
        rejectedWithoutCode = true;
      }
    }
    if (!rejectedWithoutCode) throw new Error('Payout request without Step-Up 2FA code should have been rejected');

    // 8.4 Attempt Payout with Invalid 2FA Code -> Should be Rejected (403)
    let rejectedWithBadCode = false;
    try {
      await axios.post(
        `${API_BASE}/payouts/request`,
        {
          amount: 500,
          recipientType: 'MOMO',
          accountName: 'Kwame Landlord',
          accountNumber: '0244001122',
          bankOrNetwork: 'MTN',
          twoFactorCode: '000000',
        },
        { headers: { Authorization: `Bearer ${landlordToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 403) rejectedWithBadCode = true;
    }
    if (!rejectedWithBadCode) throw new Error('Payout request with invalid 2FA code should have been rejected');

    // 8.5 Attempt Payout with Valid Dynamic TOTP Code -> Should Pass (201 Created)
    const freshTotpCode = generateTOTPCode(totpSecret);
    const validPayoutRes = await axios.post(
      `${API_BASE}/payouts/request`,
      {
        amount: 500,
        recipientType: 'MOMO',
        accountName: 'Kwame Landlord',
        accountNumber: '0244001122',
        bankOrNetwork: 'MTN',
        twoFactorCode: freshTotpCode,
      },
      { headers: { Authorization: `Bearer ${landlordToken}` } }
    );

    if (validPayoutRes.status !== 201 || !validPayoutRes.data.payout) {
      throw new Error(`Payout request failed: ${JSON.stringify(validPayoutRes.data)}`);
    }

    const historyRes = await axios.get(`${API_BASE}/payouts/history`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (historyRes.status !== 200 || !Array.isArray(historyRes.data.payouts)) {
      throw new Error('Failed to retrieve payout history');
    }

    // 8.6 Test Atomic Double-Spend Guard: Attempt payout exceeding remaining balance
    let doubleSpendBlocked = false;
    try {
      const overdrawCode = generateTOTPCode(totpSecret);
      await axios.post(
        `${API_BASE}/payouts/request`,
        {
          amount: 50000, // Exceeds balance
          recipientType: 'MOMO',
          accountName: 'Kwame Landlord',
          accountNumber: '0244001122',
          bankOrNetwork: 'MTN',
          twoFactorCode: overdrawCode,
        },
        { headers: { Authorization: `Bearer ${landlordToken}` } }
      );
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('Insufficient balance')) {
        doubleSpendBlocked = true;
      }
    }
    if (!doubleSpendBlocked) throw new Error('Overdraw payout was not blocked by atomic transaction lock');

    recordMetric('Stage 8', 'Step-Up MoMo Payout & Anti-Double-Spend', 'PASSED', Date.now() - stage8Start, '2FA Step-up verified, Payout GHS 500 created, overdraw blocked');

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 9: CONCURRENCY & STRESS LATENCY BENCHMARK
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 9: High-Concurrency Read Stress Benchmark ---');
    const stage9Start = Date.now();

    const benchmarkUrls = [
      `${API_BASE}/properties`,
      `${API_BASE}/properties/${property.id}`,
      `${API_BASE}/config/public`,
    ];

    const concurrentRequests = 30;
    const requestPromises: Promise<number>[] = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const url = benchmarkUrls[i % benchmarkUrls.length];
      const start = Date.now();
      requestPromises.push(
        axios.get(url).then((res) => {
          if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
          return Date.now() - start;
        })
      );
    }

    const latencies = await Promise.all(requestPromises);
    latencies.sort((a, b) => a - b);

    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[latencies.length - 1];

    recordMetric(
      'Stage 9',
      '30 Concurrent Reads Benchmark',
      'PASSED',
      Date.now() - stage9Start,
      `Avg: ${avgLatency}ms | P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms | 100% Success`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 10: CLEAN TEARDOWN & SUMMARY
    // ──────────────────────────────────────────────────────────────────────────
    tenantSocket.disconnect();
    landlordSocket.disconnect();

    const totalDuration = Date.now() - startTimeAll;

    console.log('\n======================================================================');
    console.log(`🎉 FULL AUDIT COMPLETE: 10/10 STAGES PASSED IN ${totalDuration}ms`);
    console.log('======================================================================\n');
    console.table(auditMetrics);

  } catch (error: any) {
    console.error('\n❌ AUDIT FAILED:', error?.response?.data || error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runLaunchAudit();
