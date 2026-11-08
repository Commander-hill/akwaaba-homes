"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportGRATaxReport = exports.getLandlordFinancialLedger = exports.verifyPaymentStatus = exports.fulfillBookingPayment = exports.handlePaystackWebhook = exports.getLandlordEarningsReport = exports.downloadReceiptPDF = exports.getTransactionById = exports.getTenantTransactions = exports.getLandlordCashflows = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const config_service_1 = require("../utils/config.service");
const pdf_service_1 = require("../utils/pdf.service");
const auditLogger_1 = require("../utils/auditLogger");
const getLandlordCashflows = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const role = req.user.role;
        if (role !== 'LANDLORD') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        // Fetch all successful transactions for this landlord
        const transactions = await prisma_1.default.transaction.findMany({
            where: { landlordId, status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            include: {
                tenant: { select: { firstName: true, lastName: true, email: true } },
                property: { select: { title: true, location: true } },
            }
        });
        // Aggregate by month for the chart (Format: { name: 'Jan', total: 1500 })
        const monthlyData = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        // Initialize the last 6 months to 0 for a clean chart
        const currentMonthIndex = new Date().getMonth();
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonthIndex - i + 12) % 12;
            monthlyData[months[monthIndex]] = 0;
        }
        let totalRevenue = 0;
        transactions.forEach(t => {
            totalRevenue += t.amount;
            const month = months[new Date(t.createdAt).getMonth()];
            if (monthlyData[month] !== undefined) {
                monthlyData[month] += t.amount;
            }
        });
        const chartData = Object.keys(monthlyData).map(key => ({
            name: key,
            total: monthlyData[key]
        }));
        res.status(200).json({
            totalRevenue,
            chartData,
            transactions
        });
    }
    catch (error) {
        console.error('Error fetching cashflows:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordCashflows = getLandlordCashflows;
const getTenantTransactions = async (req, res) => {
    try {
        const tenantId = req.user.id;
        const transactions = await prisma_1.default.transaction.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                property: { select: { title: true, location: true, images: true } },
                landlord: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
                booking: { select: { startDate: true, endDate: true, status: true } },
                room: { select: { roomType: true, price: true } }
            }
        });
        res.status(200).json({ transactions });
    }
    catch (error) {
        console.error('Error fetching tenant transactions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantTransactions = getTenantTransactions;
const resolveTransactionOrBookingReceipt = async (id) => {
    let transaction = await prisma_1.default.transaction.findFirst({
        where: {
            OR: [
                { id },
                { bookingId: id },
                { reference: id }
            ]
        },
        include: {
            tenant: true,
            property: {
                include: {
                    landlord: {
                        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
                    }
                }
            },
            room: true,
            booking: {
                include: {
                    room: true,
                    roomUnit: true,
                    bed: true
                }
            }
        }
    });
    if (transaction) {
        return {
            ...transaction,
            paymentReference: transaction.reference,
            paymentMethod: 'Paystack (MoMo / Card)',
            room: transaction.room || transaction.booking?.room || null
        };
    }
    // Fallback: look up directly by Booking ID if no Transaction row exists yet
    const booking = await prisma_1.default.booking.findUnique({
        where: { id },
        include: {
            tenant: true,
            property: {
                include: {
                    landlord: {
                        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
                    }
                }
            },
            room: true,
            roomUnit: true,
            bed: true,
            transaction: true
        }
    });
    if (!booking)
        return null;
    const baseRent = booking.room?.price ?? booking.property?.price ?? 0;
    const caution = booking.cautionDepositAmount ?? booking.property?.cautionDeposit ?? 0;
    const totalAmount = booking.transaction?.amount ?? (baseRent + caution);
    const isPaid = ['COMPLETED', 'ACTIVE', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status);
    const syntheticRef = booking.transaction?.reference || (booking.checkInCode ? `PAY-${booking.checkInCode}` : `INV-${booking.id.slice(0, 8).toUpperCase()}`);
    return {
        id: booking.transaction?.id || booking.id,
        bookingId: booking.id,
        tenantId: booking.tenantId,
        landlordId: booking.property.landlordId,
        propertyId: booking.propertyId,
        roomId: booking.roomId,
        amount: totalAmount,
        reference: syntheticRef,
        paymentReference: syntheticRef,
        paymentMethod: isPaid ? 'Paystack (MoMo / Card)' : 'Pending Settlement',
        status: booking.transaction?.status || (isPaid ? 'SUCCESS' : 'PENDING'),
        createdAt: booking.transaction?.createdAt || booking.updatedAt || booking.createdAt,
        tenant: booking.tenant,
        property: booking.property,
        room: booking.room,
        booking
    };
};
const getTransactionById = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const id = req.params.id;
        const transaction = await resolveTransactionOrBookingReceipt(id);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }
        // Ensure the user is either the tenant who made the payment, the landlord of the property, authorized staff, or an admin
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId: transaction.propertyId, userId }
        });
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
        const isOwnerLandlord = transaction.landlordId === userId || transaction.property?.landlordId === userId;
        if (!isAdmin && transaction.tenantId !== userId && !isOwnerLandlord && !isStaff) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        res.status(200).json({ transaction });
    }
    catch (error) {
        console.error('Error fetching transaction by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTransactionById = getTransactionById;
const pdf_service_2 = require("../utils/pdf.service");
const downloadReceiptPDF = async (req, res) => {
    try {
        const id = req.params.id;
        const transaction = await resolveTransactionOrBookingReceipt(id);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction record not found' });
            return;
        }
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId: transaction.propertyId, userId }
        });
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
        const isOwnerLandlord = transaction.landlordId === userId || transaction.property?.landlordId === userId;
        // Check authorization: must be tenant who paid, property landlord, authorized property staff, or admin
        if (!isAdmin && transaction.tenantId !== userId && !isOwnerLandlord && !isStaff) {
            res.status(403).json({ message: 'Forbidden: You do not have access to this receipt' });
            return;
        }
        const sysConfig = await (0, config_service_1.getSystemConfig)();
        const commissionPercent = sysConfig.platformCommissionPercent || 5.0;
        const platformFee = (transaction.amount * commissionPercent) / 100;
        const netAmount = transaction.amount - platformFee;
        const createdAtIso = transaction.createdAt instanceof Date
            ? transaction.createdAt.toISOString()
            : new Date(transaction.createdAt).toISOString();
        const landlord = transaction.property?.landlord;
        const booking = transaction.booking;
        const room = transaction.room || booking?.room;
        const unitParts = [
            room?.blockName ? `Block ${room.blockName}` : null,
            booking?.roomUnit?.unitNumber ? `Unit ${booking.roomUnit.unitNumber}` : null,
            booking?.bed?.bedNumber ? `Bed ${booking.bed.bedNumber}` : null
        ].filter(Boolean);
        const startStr = booking?.startDate
            ? new Date(booking.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
        const endStr = booking?.endDate
            ? new Date(booking.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
        const cautionAmount = Number(booking?.cautionDepositAmount ?? transaction.property?.cautionDeposit ?? 0);
        const totalPaid = Number(transaction.amount || 0);
        const baseRentAmount = cautionAmount > 0 && totalPaid > cautionAmount ? totalPaid - cautionAmount : totalPaid;
        const pdfBuffer = await (0, pdf_service_2.generateReceiptPDF)({
            transactionId: transaction.id,
            bookingId: booking?.id || transaction.bookingId,
            reference: transaction.reference,
            studentName: `${transaction.tenant.firstName} ${transaction.tenant.lastName}`,
            studentEmail: transaction.tenant.email,
            studentPhone: transaction.tenant.phoneNumber || 'N/A',
            studentId: transaction.tenant.studentId || null,
            studentCampus: transaction.tenant.campus || null,
            landlordName: landlord ? `${landlord.firstName} ${landlord.lastName}` : null,
            landlordPhone: landlord?.phoneNumber || null,
            landlordEmail: landlord?.email || null,
            propertyTitle: transaction.property.title,
            propertyLocation: transaction.property.location || null,
            roomType: room?.roomType || transaction.property?.type || 'Residential Unit',
            unitAllocation: unitParts.length > 0 ? unitParts.join(' • ') : 'Standard Allocation',
            startDate: startStr,
            endDate: endStr,
            pricePeriod: transaction.property?.pricePeriod || null,
            baseRentAmount,
            cautionDepositAmount: totalPaid > baseRentAmount ? cautionAmount : 0,
            grossAmount: totalPaid,
            platformFee,
            netAmount,
            paymentMethod: transaction.paymentMethod || 'Paystack (MoMo / Card)',
            paymentStatus: transaction.status,
            checkInCode: booking?.checkInCode || null,
            paidAt: createdAtIso
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Receipt_${transaction.reference}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating PDF receipt:', error);
        res.status(500).json({ message: 'Failed to generate PDF receipt document' });
    }
};
exports.downloadReceiptPDF = downloadReceiptPDF;
const getLandlordEarningsReport = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const sysConfig = await (0, config_service_1.getSystemConfig)();
        const commissionPercent = sysConfig.platformCommissionPercent || 5.0;
        // Fetch all successful transactions for this landlord
        const transactions = await prisma_1.default.transaction.findMany({
            where: { landlordId, status: 'SUCCESS' },
            include: {
                booking: {
                    include: {
                        property: { select: { title: true, id: true } },
                        room: { select: { roomType: true, price: true } },
                        tenant: { select: { firstName: true, lastName: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        let totalGrossEarnings = 0;
        let thisMonthGrossEarnings = 0;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const cashflows = transactions.map(tx => {
            const gross = tx.amount;
            const commission = (gross * commissionPercent) / 100;
            const net = gross - commission;
            totalGrossEarnings += gross;
            const txDate = new Date(tx.createdAt);
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                thisMonthGrossEarnings += gross;
            }
            return {
                id: tx.id,
                reference: tx.reference,
                paymentMethod: 'Paystack Direct',
                grossAmount: gross,
                commissionFee: commission,
                netAmount: net,
                createdAt: tx.createdAt,
                propertyTitle: tx.booking?.property?.title || 'Property',
                roomType: tx.booking?.room?.roomType || 'Room',
                tenantName: tx.booking?.tenant ? `${tx.booking.tenant.firstName} ${tx.booking.tenant.lastName}` : 'Tenant'
            };
        });
        const totalCommissionDeducted = (totalGrossEarnings * commissionPercent) / 100;
        const totalNetEarnings = totalGrossEarnings - totalCommissionDeducted;
        const thisMonthNetEarnings = thisMonthGrossEarnings - (thisMonthGrossEarnings * commissionPercent) / 100;
        // Group monthly revenue trends (last 6 months)
        const monthlyTrendsMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
            monthlyTrendsMap[key] = { month: key, gross: 0, net: 0 };
        }
        transactions.forEach(tx => {
            const d = new Date(tx.createdAt);
            const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
            if (monthlyTrendsMap[key]) {
                const gross = tx.amount;
                const net = gross - (gross * commissionPercent) / 100;
                monthlyTrendsMap[key].gross += gross;
                monthlyTrendsMap[key].net += net;
            }
        });
        res.status(200).json({
            summary: {
                totalGrossEarnings,
                totalCommissionDeducted,
                totalNetEarnings,
                thisMonthGrossEarnings,
                thisMonthNetEarnings,
                platformCommissionPercent: commissionPercent,
                totalBookingsPaid: transactions.length
            },
            monthlyTrends: Object.values(monthlyTrendsMap),
            recentCashflows: cashflows
        });
    }
    catch (error) {
        console.error('Error fetching landlord earnings report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordEarningsReport = getLandlordEarningsReport;
const crypto_1 = __importDefault(require("crypto"));
const notification_service_1 = require("../utils/notification.service");
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("../utils/cache"));
const handlePaystackWebhook = async (req, res) => {
    try {
        const paystackSignature = req.headers['x-paystack-signature'];
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey) {
            console.warn('[Paystack Webhook] Missing PAYSTACK_SECRET_KEY on backend');
            res.status(500).json({ message: 'Webhook handler misconfigured' });
            return;
        }
        if (!paystackSignature) {
            console.warn('[Paystack Webhook] Missing x-paystack-signature header');
            res.status(401).json({ message: 'Missing signature header' });
            return;
        }
        const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf8');
        const hash = crypto_1.default.createHmac('sha512', secretKey).update(rawPayload).digest('hex');
        const expectedBuf = Buffer.from(hash, 'utf8');
        const actualBuf = Buffer.from(paystackSignature, 'utf8');
        if (expectedBuf.length !== actualBuf.length || !crypto_1.default.timingSafeEqual(expectedBuf, actualBuf)) {
            console.error('[Paystack Webhook] Invalid HMAC SHA512 signature header');
            res.status(401).json({ message: 'Invalid webhook signature' });
            return;
        }
        const { event, data } = req.body;
        if (event === 'charge.success') {
            const reference = data?.reference;
            const bookingId = data?.metadata?.bookingId;
            const paidAmountGhs = data?.amount ? Number(data.amount) / 100 : undefined;
            const fulfillResult = await (0, exports.fulfillBookingPayment)({
                bookingId,
                reference,
                paidAmountGhs,
                channel: data?.channel,
                ipAddress: req.ip || 'PAYSTACK_WEBHOOK'
            });
            console.log('[Paystack Webhook] Charge.success handled:', fulfillResult.message);
        }
        res.status(200).json({ status: 'success' });
    }
    catch (error) {
        console.error('[Paystack Webhook] Error handling webhook:', error);
        res.status(500).json({ message: 'Webhook execution error' });
    }
};
exports.handlePaystackWebhook = handlePaystackWebhook;
/**
 * ── IDEMPOTENT ATOMIC PAYMENT FULFILLMENT ──
 * Unified handler used by Webhooks, Polling Reconciliation, and Manual Verify
 */
const fulfillBookingPayment = async (params) => {
    const { bookingId, reference, paidAmountGhs, channel, ipAddress, actorId } = params;
    let booking = null;
    if (bookingId) {
        booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: { property: true, room: true, tenant: { select: { id: true, firstName: true, lastName: true, email: true } } }
        });
    }
    else if (reference) {
        booking = await prisma_1.default.booking.findFirst({
            where: {
                OR: [
                    { paymentReference: reference },
                    { id: reference }
                ]
            },
            include: { property: true, room: true, tenant: { select: { id: true, firstName: true, lastName: true, email: true } } }
        });
        if (!booking) {
            const tx = await prisma_1.default.transaction.findFirst({ where: { reference } });
            if (tx) {
                booking = await prisma_1.default.booking.findUnique({
                    where: { id: tx.bookingId },
                    include: { property: true, room: true, tenant: { select: { id: true, firstName: true, lastName: true, email: true } } }
                });
            }
        }
    }
    if (!booking) {
        return { success: false, message: 'Booking not found for reference' };
    }
    // Idempotency: If already completed
    if (['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(booking.status)) {
        const existingTx = await prisma_1.default.transaction.findFirst({ where: { bookingId: booking.id } });
        return { success: true, message: 'Booking already completed', booking, transaction: existingTx };
    }
    // Duplicate transaction check
    if (reference) {
        const existingTx = await prisma_1.default.transaction.findFirst({ where: { reference } });
        if (existingTx) {
            return { success: true, message: 'Transaction reference already recorded', booking, transaction: existingTx };
        }
    }
    const expectedPrice = booking.room ? booking.room.price : (booking.property?.price || 0);
    const finalPaid = paidAmountGhs !== undefined && paidAmountGhs > 0 ? paidAmountGhs : expectedPrice;
    // Price tampering validation
    if (expectedPrice > 0 && finalPaid < expectedPrice) {
        try {
            await (0, auditLogger_1.logAudit)(actorId || booking.tenantId, 'PAYMENT_PRICE_TAMPERING_BLOCKED', 'Booking', booking.id, { expectedPrice, finalPaid, reference }, null, ipAddress || 'SYSTEM');
        }
        catch (e) { }
        return { success: false, message: 'Payment rejected: amount paid does not cover room price.' };
    }
    const operations = [
        prisma_1.default.booking.update({
            where: { id: booking.id },
            data: {
                status: 'COMPLETED',
                paymentReference: reference
            }
        }),
        prisma_1.default.transaction.create({
            data: {
                bookingId: booking.id,
                tenantId: booking.tenantId,
                landlordId: booking.property.landlordId,
                propertyId: booking.propertyId,
                roomId: booking.roomId,
                amount: finalPaid,
                reference: reference || ('REF_' + Date.now()),
                status: 'SUCCESS'
            }
        })
    ];
    if (booking.bedId) {
        operations.push(prisma_1.default.bed.update({
            where: { id: booking.bedId },
            data: { status: 'BOOKED' }
        }));
    }
    const [updatedBooking, newTx] = await prisma_1.default.$transaction(operations);
    // Recalibrate Capacity and auto-reject oversubscribed bookings
    if (booking.roomId && booking.room) {
        const completedBookings = await prisma_1.default.booking.count({
            where: { roomId: booking.roomId, status: { in: ['COMPLETED', 'ACTIVE', 'CHECKED_IN'] } }
        });
        if (completedBookings >= booking.room.numberOfRooms * booking.room.bedsPerRoom) {
            await prisma_1.default.booking.updateMany({
                where: {
                    roomId: booking.roomId,
                    id: { not: booking.id },
                    status: { in: ['PENDING', 'APPROVED'] }
                },
                data: { status: 'REJECTED' }
            });
        }
    }
    // Dispatch Notifications
    if (booking.tenant?.email) {
        try {
            await (0, notification_service_1.notifyBookingStatusChanged)({
                tenantId: booking.tenantId,
                tenantEmail: booking.tenant.email,
                tenantName: booking.tenant.firstName + ' ' + booking.tenant.lastName,
                propertyTitle: booking.property.title,
                status: 'COMPLETED'
            });
            await (0, notification_service_1.notifyPaymentReceipt)({
                tenantId: booking.tenantId,
                tenantEmail: booking.tenant.email,
                tenantName: booking.tenant.firstName + ' ' + booking.tenant.lastName,
                propertyTitle: booking.property.title,
                amount: finalPaid,
                bookingId: booking.id
            });
        }
        catch (e) { }
    }
    // Socket broadcast & Cache flush
    try {
        const io = (0, socket_1.getIO)();
        io.emit('booking_updated', { bookingId: booking.id, propertyId: booking.propertyId });
        io.emit('property_updated', { propertyId: booking.propertyId });
        io.to(booking.property.landlordId).emit('financials_updated', { propertyId: booking.propertyId });
        cache_1.default.flushAll();
    }
    catch (e) { }
    return { success: true, message: 'Payment successfully fulfilled', booking: updatedBooking, transaction: newTx };
};
exports.fulfillBookingPayment = fulfillBookingPayment;
/**
 * Endpoint for Tenant or Admin to verify payment status on demand
 * Handles MoMo USSD ongoing/pending states with 202 status
 */
const verifyPaymentStatus = async (req, res) => {
    try {
        const reference = String(req.params.reference || "");
        const userId = req.user?.id;
        if (!reference) {
            res.status(400).json({ message: 'Transaction reference is required' });
            return;
        }
        // Check if already completed locally
        const existingTx = await prisma_1.default.transaction.findFirst({
            where: { reference },
            include: { booking: true }
        });
        if (existingTx) {
            res.status(200).json({
                status: 'SUCCESS',
                message: 'Payment already verified and completed.',
                transaction: existingTx,
                booking: existingTx.booking
            });
            return;
        }
        const paystackKey = process.env.PAYSTACK_SECRET_KEY;
        const isProduction = process.env.NODE_ENV === 'production';
        const isTestKey = !paystackKey || paystackKey.startsWith('sk_test_') || paystackKey.includes('replace_with_your_actual');
        const isTestRef = (!isProduction && isTestKey) && reference.startsWith('BOOKING_TEST_');
        if (isTestRef) {
            const bkg = await prisma_1.default.booking.findFirst({
                where: { OR: [{ paymentReference: reference }, { id: reference }] }
            });
            if (bkg) {
                const fulfill = await (0, exports.fulfillBookingPayment)({
                    bookingId: bkg.id,
                    reference,
                    ipAddress: req.ip,
                    actorId: userId
                });
                res.status(200).json({ status: 'SUCCESS', ...fulfill });
                return;
            }
        }
        if (!paystackKey) {
            res.status(500).json({ message: 'Paystack secret key is not configured.' });
            return;
        }
        const paystackRes = await axios_1.default.get('https://api.paystack.co/transaction/verify/' + reference, {
            headers: { Authorization: 'Bearer ' + paystackKey }
        });
        const txData = paystackRes.data?.data;
        const paystackStatus = txData?.status;
        const bookingId = txData?.metadata?.bookingId;
        if (paystackStatus === 'success') {
            const fulfill = await (0, exports.fulfillBookingPayment)({
                bookingId,
                reference,
                paidAmountGhs: txData.amount ? txData.amount / 100 : undefined,
                channel: txData.channel,
                ipAddress: req.ip,
                actorId: userId
            });
            res.status(200).json({ status: 'SUCCESS', ...fulfill });
            return;
        }
        else if (['ongoing', 'pending', 'processing'].includes(paystackStatus)) {
            res.status(202).json({
                status: 'PENDING',
                message: 'Mobile Money authorization prompt is active. Please confirm the prompt on your mobile phone and enter your MoMo PIN.',
                reference
            });
            return;
        }
        else {
            res.status(400).json({
                status: 'FAILED',
                message: txData?.gateway_response || 'Payment was not approved or timed out on your phone.',
                reference
            });
            return;
        }
    }
    catch (error) {
        console.error('Error verifying payment status:', error.response?.data || error);
        res.status(500).json({ message: 'Failed to verify payment status with payment provider' });
    }
};
exports.verifyPaymentStatus = verifyPaymentStatus;
/**
 * Fetch Landlord Financial Ledger (Gross Revenue, Maintenance Expense Deductions, 5% GRA Tax, Net Yield)
 */
const getLandlordFinancialLedger = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        // Fetch successful rental transactions
        const transactions = await prisma_1.default.transaction.findMany({
            where: {
                landlordId,
                status: 'SUCCESS',
                createdAt: { gte: startDate, lte: endDate }
            },
            include: {
                property: { select: { id: true, title: true } }
            }
        });
        // Fetch resolved maintenance tickets with cost for this landlord's properties
        const properties = await prisma_1.default.property.findMany({
            where: { landlordId },
            select: { id: true, title: true }
        });
        const propertyIds = properties.map((p) => p.id);
        const maintenanceTickets = await prisma_1.default.maintenanceTicket.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'RESOLVED',
                repairCost: { not: null }
            }
        });
        const propertyExpenses = await prisma_1.default.propertyExpense.findMany({
            where: {
                propertyId: { in: propertyIds },
                date: { gte: startDate, lte: endDate }
            }
        });
        // Aggregates
        const grossRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalTicketCosts = maintenanceTickets.reduce((sum, ticket) => sum + (ticket.repairCost || 0), 0);
        const totalExpenseCosts = propertyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalMaintenanceDeductions = totalTicketCosts + totalExpenseCosts;
        const withholdingTax5Percent = parseFloat(((grossRevenue - totalMaintenanceDeductions) * 0.05).toFixed(2));
        const netTaxableIncome = Math.max(0, grossRevenue - totalMaintenanceDeductions - withholdingTax5Percent);
        // Property Breakdown
        const propertyBreakdown = properties.map((prop) => {
            const propGross = transactions
                .filter((tx) => tx.propertyId === prop.id)
                .reduce((sum, tx) => sum + tx.amount, 0);
            const propTickets = maintenanceTickets
                .filter((t) => t.propertyId === prop.id)
                .reduce((sum, t) => sum + (t.repairCost || 0), 0);
            const propExp = propertyExpenses
                .filter((e) => e.propertyId === prop.id)
                .reduce((sum, e) => sum + e.amount, 0);
            const propMaintenance = propTickets + propExp;
            return {
                propertyId: prop.id,
                title: prop.title,
                gross: propGross,
                maintenance: propMaintenance,
                net: Math.max(0, propGross - propMaintenance)
            };
        });
        res.status(200).json({
            taxYear: year,
            grossRevenue,
            totalMaintenanceDeductions,
            withholdingTax5Percent,
            netTaxableIncome,
            transactionCount: transactions.length,
            propertyBreakdown
        });
    }
    catch (error) {
        console.error('Error fetching landlord financial ledger:', error);
        res.status(500).json({ message: 'Failed to generate financial ledger' });
    }
};
exports.getLandlordFinancialLedger = getLandlordFinancialLedger;
/**
 * Export GRA Tax Report (PDF or CSV)
 */
const exportGRATaxReport = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const format = req.query.format || 'pdf'; // pdf or csv
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        const landlord = await prisma_1.default.user.findUnique({
            where: { id: landlordId },
            select: { firstName: true, lastName: true, email: true, phoneNumber: true }
        });
        if (!landlord) {
            res.status(404).json({ message: 'Landlord profile not found' });
            return;
        }
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        const transactions = await prisma_1.default.transaction.findMany({
            where: {
                landlordId,
                status: 'SUCCESS',
                createdAt: { gte: startDate, lte: endDate }
            },
            include: {
                property: { select: { id: true, title: true } }
            }
        });
        const properties = await prisma_1.default.property.findMany({
            where: { landlordId },
            select: { id: true, title: true }
        });
        const propertyIds = properties.map((p) => p.id);
        const maintenanceTickets = await prisma_1.default.maintenanceTicket.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: 'RESOLVED',
                repairCost: { not: null }
            }
        });
        const propertyExpenses = await prisma_1.default.propertyExpense.findMany({
            where: {
                propertyId: { in: propertyIds },
                date: { gte: startDate, lte: endDate }
            }
        });
        const grossRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalTicketCosts = maintenanceTickets.reduce((sum, ticket) => sum + (ticket.repairCost || 0), 0);
        const totalExpenseCosts = propertyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalMaintenanceDeductions = totalTicketCosts + totalExpenseCosts;
        const withholdingTax5Percent = parseFloat(((grossRevenue - totalMaintenanceDeductions) * 0.05).toFixed(2));
        const netTaxableIncome = Math.max(0, grossRevenue - totalMaintenanceDeductions - withholdingTax5Percent);
        const propertyBreakdown = properties.map((prop) => {
            const propGross = transactions
                .filter((tx) => tx.propertyId === prop.id)
                .reduce((sum, tx) => sum + tx.amount, 0);
            const propTickets = maintenanceTickets
                .filter((t) => t.propertyId === prop.id)
                .reduce((sum, t) => sum + (t.repairCost || 0), 0);
            const propExp = propertyExpenses
                .filter((e) => e.propertyId === prop.id)
                .reduce((sum, e) => sum + e.amount, 0);
            const propMaintenance = propTickets + propExp;
            return {
                title: prop.title,
                gross: propGross,
                maintenance: propMaintenance,
                net: Math.max(0, propGross - propMaintenance)
            };
        });
        if (format.toLowerCase() === 'csv') {
            // CSV Generation
            let csvContent = 'GHANA REVENUE AUTHORITY (GRA) - ANNUAL RENTAL INCOME TAX STATEMENT\n';
            csvContent += `Taxpayer Name,${landlord.firstName} ${landlord.lastName}\n`;
            csvContent += `Email,${landlord.email}\n`;
            csvContent += `Phone,${landlord.phoneNumber || 'N/A'}\n`;
            csvContent += `Tax Year,${year}\n\n`;
            csvContent += 'FINANCIAL SUMMARY\n';
            csvContent += `Gross Rental Revenue (GHS),${grossRevenue.toFixed(2)}\n`;
            csvContent += `Allowable Maintenance Deductions (GHS),${totalMaintenanceDeductions.toFixed(2)}\n`;
            csvContent += `Withholding Tax @ 5% (GHS),${withholdingTax5Percent.toFixed(2)}\n`;
            csvContent += `Net Taxable Income (GHS),${netTaxableIncome.toFixed(2)}\n\n`;
            csvContent += 'PROPERTY BREAKDOWN\n';
            csvContent += 'Property Title,Gross Revenue (GHS),Maintenance Expenses (GHS),Net Yield (GHS)\n';
            propertyBreakdown.forEach((p) => {
                csvContent += `"${p.title.replace(/"/g, '""')}",${p.gross.toFixed(2)},${p.maintenance.toFixed(2)},${p.net.toFixed(2)}\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=GRA_Tax_Statement_${year}_${landlord.lastName}.csv`);
            res.status(200).send(csvContent);
            return;
        }
        // PDF Generation
        const pdfBuffer = await (0, pdf_service_1.generateGRATaxReportPDF)({
            landlordName: `${landlord.firstName} ${landlord.lastName}`,
            landlordEmail: landlord.email,
            landlordPhone: landlord.phoneNumber || 'N/A',
            taxYear: year,
            grossRevenue,
            totalMaintenanceDeductions,
            withholdingTax5Percent,
            netTaxableIncome,
            transactionCount: transactions.length,
            propertyBreakdown
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=GRA_Tax_Statement_${year}_${landlord.lastName}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error exporting GRA Tax Statement:', error);
        res.status(500).json({ message: 'Failed to generate GRA Tax Statement' });
    }
};
exports.exportGRATaxReport = exportGRATaxReport;
//# sourceMappingURL=transaction.controller.js.map