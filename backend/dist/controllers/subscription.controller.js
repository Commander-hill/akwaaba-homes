"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLandlordSubscriptionsOverview = exports.checkExpirations = exports.handlePaystackWebhook = exports.verifyPayment = exports.initializePayment = exports.getSubscriptionStatus = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const notification_service_1 = require("../utils/notification.service");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("../utils/cache"));
const getSubscriptionStatus = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId } = req.query;
        if (!landlordId || !propertyId) {
            res.status(401).json({ message: 'Unauthorized or missing propertyId' });
            return;
        }
        const landlord = await prisma_1.default.user.findUnique({
            where: { id: landlordId },
            select: { isSuspended: true }
        });
        const subscription = await prisma_1.default.propertySubscription.findFirst({
            where: { propertyId: propertyId, property: { landlordId } },
            orderBy: { createdAt: 'desc' }
        });
        if (!subscription) {
            res.status(200).json({ isActive: false, message: 'No active subscription found for this property.' });
            return;
        }
        // Check if subscription has expired
        const isExpired = new Date() > new Date(subscription.endDate);
        if (isExpired && subscription.isActive) {
            await prisma_1.default.propertySubscription.update({
                where: { id: subscription.id },
                data: { isActive: false }
            });
            subscription.isActive = false;
            // Mark property unavailable
            const updatedProp = await prisma_1.default.property.update({
                where: { id: propertyId },
                data: { isAvailable: false },
                select: { title: true }
            });
            await prisma_1.default.notification.create({
                data: {
                    userId: landlordId,
                    type: 'ANNOUNCEMENT',
                    title: '⏳ Property Subscription Expired',
                    message: `Your listing subscription for "${updatedProp.title}" has expired. The property is currently unlisted. Please renew to resume receiving booking requests.`,
                    link: '/dashboard/landlord'
                }
            }).catch(() => { });
            try {
                cache_1.default.flushAll();
                const io = (0, socket_1.getIO)();
                io.emit('property_updated', { propertyId });
                io.to(landlordId).emit('notification', {
                    title: '⏳ Property Subscription Expired',
                    message: `Your listing subscription for "${updatedProp.title}" has expired.`,
                    type: 'ANNOUNCEMENT'
                });
            }
            catch (e) { /* non-blocking */ }
        }
        res.status(200).json({
            isActive: subscription.isActive,
            paymentStatus: subscription.paymentStatus,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            accountStatus: landlord?.isSuspended ? 'Suspended' : 'Active',
            subscription
        });
    }
    catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSubscriptionStatus = getSubscriptionStatus;
const initializePayment = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId } = req.body;
        if (!landlordId || !propertyId) {
            res.status(400).json({ message: 'Missing landlord ID or property ID' });
            return;
        }
        const landlord = await prisma_1.default.user.findUnique({ where: { id: landlordId } });
        if (!landlord) {
            res.status(404).json({ message: 'Landlord not found' });
            return;
        }
        if (landlord.ghanaCardStatus !== 'VERIFIED') {
            res.status(403).json({
                message: 'Publishing Blocked: Your Ghana Card verification is currently pending admin review. You will be able to publish your listing as soon as an administrator approves your identity verification.'
            });
            return;
        }
        const property = await prisma_1.default.property.findFirst({ where: { id: propertyId, landlordId } });
        if (!property) {
            res.status(404).json({ message: 'Property not found or does not belong to you' });
            return;
        }
        // Prevent re-subscribing if already active
        const existingActiveSub = await prisma_1.default.propertySubscription.findFirst({
            where: { propertyId, isActive: true }
        });
        if (existingActiveSub && new Date() < new Date(existingActiveSub.endDate)) {
            res.status(400).json({ message: 'This property already has an active subscription.' });
            return;
        }
        // Amount for annual property listing: derived from SUBSCRIPTION_FEE_GHS (defaults to 100 GHS = 10000 pesewas)
        const feeInGhs = parseFloat(process.env.SUBSCRIPTION_FEE_GHS || '100');
        const amountInPesewas = Math.round(feeInGhs * 100);
        const callbackUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/dashboard/landlord/properties?verify=true`
            : 'http://localhost:3000/dashboard/landlord/properties?verify=true';
        const isTestMode = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_') || process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual');
        const hasPaystackKey = !!process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual');
        let authUrl = '';
        let reference = `SUB_TEST_${Date.now()}`;
        if (hasPaystackKey) {
            try {
                const response = await axios_1.default.post('https://api.paystack.co/transaction/initialize', {
                    email: landlord.email,
                    amount: amountInPesewas,
                    currency: 'GHS',
                    callback_url: callbackUrl,
                    metadata: {
                        landlordId,
                        propertyId,
                        purpose: `Listing Fee for ${property.title}`,
                        custom_fields: [
                            { display_name: 'Landlord Name', variable_name: 'landlord_name', value: `${landlord.firstName} ${landlord.lastName}` },
                            { display_name: 'Property', variable_name: 'property_title', value: property.title }
                        ]
                    }
                }, {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                authUrl = response.data.data.authorization_url;
                reference = response.data.data.reference;
            }
            catch (paystackErr) {
                console.error('Paystack Initialization Error:', paystackErr.response?.data || paystackErr.message);
                if (isTestMode || paystackErr.response?.data?.message === 'Invalid key') {
                    console.warn('Paystack key error or test key, using simulated test url:', paystackErr.message);
                    authUrl = `${callbackUrl}&reference=${reference}&test_mode=true`;
                }
                else {
                    res.status(400).json({ message: paystackErr.response?.data?.message || 'Paystack initialization failed' });
                    return;
                }
            }
        }
        else {
            // Offline fallback only when no Paystack key is configured at all
            authUrl = `${callbackUrl}&reference=${reference}&test_mode=true`;
        }
        const existingSub = await prisma_1.default.propertySubscription.findUnique({ where: { propertyId } });
        if (existingSub) {
            await prisma_1.default.propertySubscription.update({
                where: { propertyId },
                data: { paymentReference: reference, paymentStatus: 'PENDING', isActive: false }
            });
        }
        else {
            await prisma_1.default.propertySubscription.create({
                data: {
                    propertyId,
                    paymentReference: reference,
                    paymentStatus: 'PENDING',
                    startDate: new Date(),
                    endDate: new Date(),
                    isActive: false
                }
            });
        }
        res.status(200).json({
            authorization_url: authUrl,
            reference: reference,
            isTestMode
        });
    }
    catch (error) {
        console.error('Initialize payment error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            res.status(500).json({ message: 'Invalid Paystack secret key. Please update your backend/.env file.' });
        }
        else {
            res.status(500).json({ message: 'Failed to initialize payment. Please try again.' });
        }
    }
};
exports.initializePayment = initializePayment;
const verifyPayment = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { paymentReference } = req.body;
        if (!landlordId || !paymentReference) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        // 1. Check if this reference exists in subscriptions
        const existingSub = await prisma_1.default.propertySubscription.findUnique({
            where: { paymentReference }
        });
        if (!existingSub) {
            res.status(404).json({ message: 'Subscription record not found for this reference' });
            return;
        }
        if (existingSub.isActive || existingSub.paymentStatus === 'COMPLETED') {
            res.status(400).json({ message: 'Payment reference has already been processed.' });
            return;
        }
        // 2. Verification (Live Paystack or simulated test reference)
        const isTestRef = paymentReference.startsWith('SUB_TEST_');
        const paystackKey = process.env.PAYSTACK_SECRET_KEY;
        const isTestKey = !paystackKey || paystackKey.startsWith('sk_test_') || paystackKey.includes('replace_with_your_actual');
        const feeInGhs = parseFloat(process.env.SUBSCRIPTION_FEE_GHS || '100');
        const expectedPesewas = Math.round(feeInGhs * 100);
        let isSuccess = false;
        let verifiedAmount = 0;
        if (isTestRef && isTestKey) {
            isSuccess = true;
            verifiedAmount = expectedPesewas;
        }
        else {
            if (!paystackKey) {
                res.status(500).json({ message: 'Paystack secret key is not configured.' });
                return;
            }
            try {
                const response = await axios_1.default.get(`https://api.paystack.co/transaction/verify/${paymentReference}`, { headers: { Authorization: `Bearer ${paystackKey}` } });
                const txData = response.data?.data;
                isSuccess = txData?.status === 'success';
                verifiedAmount = txData?.amount || 0;
            }
            catch (err) {
                console.error('Subscription Paystack verification error:', err.response?.data || err.message);
                res.status(400).json({ message: 'Paystack transaction verification failed with payment provider.' });
                return;
            }
        }
        if (!isSuccess) {
            res.status(400).json({ message: 'Payment verification failed: Transaction was not successful.' });
            return;
        }
        // 3. Exact amount check (pesewas)
        if (verifiedAmount < expectedPesewas) {
            res.status(400).json({
                message: `Subscription payment amount mismatch. Expected GHS ${feeInGhs.toFixed(2)}, received GHS ${(verifiedAmount / 100).toFixed(2)}.`
            });
            return;
        }
        // Update the pending subscription to active (365 days)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        const subscription = await prisma_1.default.propertySubscription.update({
            where: { id: existingSub.id },
            data: {
                paymentStatus: 'COMPLETED',
                startDate,
                endDate,
                isActive: true
            }
        });
        // Automatically make property available when subscription is paid
        await prisma_1.default.property.update({
            where: { id: existingSub.propertyId },
            data: { isAvailable: true }
        });
        try {
            cache_1.default.flushAll();
            (0, socket_1.getIO)().emit('property_updated', { propertyId: existingSub.propertyId });
        }
        catch (e) {
            /* non-blocking */
        }
        res.status(200).json({ message: 'Property listed successfully', subscription });
    }
    catch (error) {
        console.error('Verify payment error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to verify payment with Paystack' });
    }
};
exports.verifyPayment = verifyPayment;
const handlePaystackWebhook = async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret || secret.includes('replace_with_your_actual')) {
            res.status(400).send('Paystack secret not configured');
            return;
        }
        // Verify Paystack HMAC SHA512 signature using raw body buffer
        const signature = req.headers['x-paystack-signature'];
        if (!signature) {
            res.status(401).send('Missing signature header');
            return;
        }
        const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf8');
        const hash = crypto_1.default.createHmac('sha512', secret).update(rawPayload).digest('hex');
        const expectedBuf = Buffer.from(hash, 'utf8');
        const actualBuf = Buffer.from(signature, 'utf8');
        if (expectedBuf.length !== actualBuf.length || !crypto_1.default.timingSafeEqual(expectedBuf, actualBuf)) {
            res.status(401).send('Invalid signature');
            return;
        }
        const event = req.body;
        // Handle charge.success event
        if (event.event === 'charge.success') {
            const data = event.data;
            const paymentReference = data.reference;
            const existingSub = await prisma_1.default.propertySubscription.findUnique({
                where: { paymentReference }
            });
            if (existingSub && !existingSub.isActive) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setFullYear(endDate.getFullYear() + 1);
                const subscription = await prisma_1.default.propertySubscription.update({
                    where: { id: existingSub.id },
                    data: {
                        paymentStatus: 'COMPLETED',
                        startDate,
                        endDate,
                        isActive: true
                    }
                });
                // Automatically make property available when subscription is paid
                await prisma_1.default.property.update({
                    where: { id: existingSub.propertyId },
                    data: { isAvailable: true }
                });
                // Emit real-time notification to landlord via Socket.io
                try {
                    const property = await prisma_1.default.property.findUnique({ where: { id: existingSub.propertyId } });
                    if (property) {
                        (0, socket_1.getIO)().to(property.landlordId).emit('notification', {
                            title: 'Property Listing Activated',
                            message: `Payment received! Your listing for "${property.title}" is now active.`,
                            type: 'subscription'
                        });
                        (0, socket_1.getIO)().emit('property_updated', { propertyId: property.id });
                    }
                    cache_1.default.flushAll();
                }
                catch (e) {
                    console.error('Socket emission failed in webhook:', e);
                }
            }
        }
        // Paystack requires a 200 OK response to confirm receipt
        res.status(200).send('Webhook processed');
    }
    catch (error) {
        console.error('Paystack webhook error:', error);
        res.status(500).send('Internal server error');
    }
};
exports.handlePaystackWebhook = handlePaystackWebhook;
const checkExpirations = async (req, res) => {
    try {
        // Security Check: Require Admin role or matching CRON_SECRET header
        const cronSecretHeader = req.headers['x-cron-secret'];
        const validCronSecret = process.env.CRON_SECRET && cronSecretHeader === process.env.CRON_SECRET;
        const isAdmin = req.user?.role === 'ADMIN';
        if (!isAdmin && !validCronSecret) {
            res.status(403).json({ message: 'Forbidden: Admin access or valid CRON secret required' });
            return;
        }
        // In a real app, this would be triggered by a daily cron job
        const activeSubscriptions = await prisma_1.default.propertySubscription.findMany({
            where: { isActive: true },
            include: { property: { include: { landlord: { select: { id: true, email: true, firstName: true } } } } }
        });
        const now = new Date();
        let notifiedCount = 0;
        let expiredCount = 0;
        for (const sub of activeSubscriptions) {
            const expiryDate = new Date(sub.endDate);
            const diffTime = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
                // Expired!
                await prisma_1.default.propertySubscription.update({
                    where: { id: sub.id },
                    data: { isActive: false }
                });
                await prisma_1.default.property.update({
                    where: { id: sub.propertyId },
                    data: { isAvailable: false }
                });
                await prisma_1.default.notification.create({
                    data: {
                        userId: sub.property.landlord.id,
                        type: 'ANNOUNCEMENT',
                        title: '⏳ Property Subscription Expired',
                        message: `Your listing subscription for "${sub.property.title}" has expired. The property is currently unlisted. Please renew to resume receiving booking requests.`,
                        link: '/dashboard/landlord'
                    }
                }).catch(() => { });
                try {
                    const io = (0, socket_1.getIO)();
                    io.emit('property_updated', { propertyId: sub.propertyId });
                    io.to(sub.property.landlord.id).emit('notification', {
                        title: '⏳ Property Subscription Expired',
                        message: `Your listing subscription for "${sub.property.title}" has expired.`,
                        type: 'ANNOUNCEMENT'
                    });
                }
                catch (e) { /* non-blocking */ }
                expiredCount++;
            }
            else if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
                // Notify at 7, 3, and 1 days before expiry
                await (0, notification_service_1.notifySubscriptionExpirySoon)({
                    landlordId: sub.property.landlord.id,
                    landlordEmail: sub.property.landlord.email,
                    landlordName: sub.property.landlord.firstName,
                    expiryDate: sub.endDate,
                    daysLeft: diffDays
                });
                notifiedCount++;
            }
        }
        if (expiredCount > 0) {
            try {
                cache_1.default.flushAll();
            }
            catch (e) { }
        }
        res.status(200).json({
            message: 'Expiration check completed',
            processed: activeSubscriptions.length,
            notified: notifiedCount,
            expired: expiredCount
        });
    }
    catch (error) {
        console.error('Check expirations error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.checkExpirations = checkExpirations;
const getLandlordSubscriptionsOverview = async (req, res) => {
    try {
        const landlordId = req.user.id;
        // Fetch all properties belonging to landlord with their subscription
        const properties = await prisma_1.default.property.findMany({
            where: { landlordId },
            include: {
                subscription: true // one-to-one relation: PropertySubscription?
            }
        });
        const now = new Date();
        const overview = properties.map(property => {
            const sub = property.subscription || null; // singular, not array
            let daysLeft = 0;
            let isActive = false;
            let needsRenewalSoon = false;
            if (sub) {
                const endDate = new Date(sub.endDate);
                const diffTime = endDate.getTime() - now.getTime();
                daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                isActive = sub.isActive && endDate > now;
                needsRenewalSoon = isActive && daysLeft <= 7;
            }
            return {
                propertyId: property.id,
                propertyTitle: property.title,
                location: property.location,
                isAvailable: property.isAvailable,
                subscription: sub ? {
                    id: sub.id,
                    paymentReference: sub.paymentReference,
                    startDate: sub.startDate,
                    endDate: sub.endDate,
                    paymentStatus: sub.paymentStatus,
                    isActive,
                    daysLeft,
                    needsRenewalSoon
                } : null
            };
        });
        const stats = {
            totalProperties: properties.length,
            activeSubscriptions: overview.filter(p => p.subscription?.isActive).length,
            expiringSoon: overview.filter(p => p.subscription?.needsRenewalSoon).length,
            unsubscribedOrExpired: overview.filter(p => !p.subscription?.isActive).length
        };
        res.status(200).json({ stats, properties: overview });
    }
    catch (error) {
        console.error('Error fetching landlord subscriptions overview:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordSubscriptionsOverview = getLandlordSubscriptionsOverview;
//# sourceMappingURL=subscription.controller.js.map