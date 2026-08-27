"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTransferWebhook = exports.getPayoutHistory = exports.requestPayout = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const config_service_1 = require("../utils/config.service");
const notification_service_1 = require("../utils/notification.service");
const PAYSTACK_BASE = 'https://api.paystack.co';
// ─── Helper: Create Paystack Recipient ──────────────────────────────────────
async function createPaystackRecipient(type, name, accountNumber, bankOrNetwork) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey)
        throw new Error('Missing PAYSTACK_SECRET_KEY');
    const payload = type === 'mobile_money'
        ? {
            type: 'mobile_money',
            name,
            account_number: accountNumber,
            bank_code: bankOrNetwork, // MTN = MTN, Vodafone = VOD, AirtelTigo = ATL
            currency: 'GHS',
        }
        : {
            type: 'ghipss', // Ghana bank transfer
            name,
            account_number: accountNumber,
            bank_code: bankOrNetwork,
            currency: 'GHS',
        };
    const res = await axios_1.default.post(`${PAYSTACK_BASE}/transferrecipient`, payload, {
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    });
    return res.data.data.recipient_code;
}
// ─── POST /api/v1/payouts/request ───────────────────────────────────────────
const requestPayout = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        if (!landlordId || req.user?.role !== 'LANDLORD') {
            res.status(403).json({ message: 'Forbidden — Landlords only' });
            return;
        }
        const { amount, recipientType, accountName, accountNumber, bankOrNetwork } = req.body;
        if (!amount || !recipientType || !accountName || !accountNumber || !bankOrNetwork) {
            res.status(400).json({ message: 'All payout fields are required' });
            return;
        }
        if (amount < 10) {
            res.status(400).json({ message: 'Minimum withdrawal amount is GHS 10' });
            return;
        }
        // Calculate net earnings available for withdrawal
        const sysConfig = await (0, config_service_1.getSystemConfig)();
        const commissionPct = sysConfig.platformCommissionPercent || 5.0;
        const transactions = await prisma_1.default.transaction.findMany({
            where: { landlordId, status: 'SUCCESS' },
        });
        const totalNetEarnings = transactions.reduce((acc, tx) => {
            const net = tx.amount - (tx.amount * commissionPct) / 100;
            return acc + net;
        }, 0);
        // Sum previous successful payouts
        const previousPayouts = await prisma_1.default.payoutRequest.findMany({
            where: { landlordId, status: { in: ['PENDING', 'PROCESSING', 'SUCCESS'] } },
        });
        const totalPaidOut = previousPayouts.reduce((acc, p) => acc + p.amount, 0);
        const availableBalance = totalNetEarnings - totalPaidOut;
        if (amount > availableBalance) {
            res.status(400).json({
                message: `Insufficient balance. Available: GHS ${availableBalance.toFixed(2)}`,
                availableBalance,
            });
            return;
        }
        // Create payout record immediately (PENDING state)
        const payout = await prisma_1.default.payoutRequest.create({
            data: {
                landlordId,
                amount,
                recipientType,
                accountName,
                accountNumber,
                bankOrNetwork,
                status: 'PENDING',
            },
        });
        // Attempt Paystack Transfer in background
        setImmediate(async () => {
            try {
                const isMomo = recipientType === 'MOMO';
                const networkCodeMap = {
                    MTN: 'MTN',
                    Vodafone: 'VOD',
                    AirtelTigo: 'ATL',
                };
                const bankCode = isMomo ? (networkCodeMap[bankOrNetwork] ?? bankOrNetwork) : bankOrNetwork;
                // Step 1: Create Paystack recipient
                const recipientCode = await createPaystackRecipient(isMomo ? 'mobile_money' : 'ghipss', accountName, accountNumber, bankCode);
                // Step 2: Initiate transfer
                const secretKey = process.env.PAYSTACK_SECRET_KEY;
                const transferRef = `akwaaba-payout-${payout.id}-${Date.now()}`;
                const transferRes = await axios_1.default.post(`${PAYSTACK_BASE}/transfer`, {
                    source: 'balance',
                    amount: Math.round(amount * 100), // Paystack uses kobo (pesewas)
                    recipient: recipientCode,
                    reason: `Akwaaba Homes Earnings Payout — ${accountName}`,
                    reference: transferRef,
                    currency: 'GHS',
                }, { headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' } });
                const transferData = transferRes.data.data;
                const status = transferData.status === 'success' ? 'SUCCESS' : 'PROCESSING';
                await prisma_1.default.payoutRequest.update({
                    where: { id: payout.id },
                    data: {
                        status,
                        recipientCode,
                        transferReference: transferRef,
                        processedAt: status === 'SUCCESS' ? new Date() : null,
                    },
                });
                // Trigger SMS & Email notification to landlord
                const landlord = await prisma_1.default.user.findUnique({
                    where: { id: landlordId },
                    select: { email: true, firstName: true, lastName: true, phoneNumber: true },
                });
                if (landlord) {
                    (0, notification_service_1.notifyPayoutSent)({
                        landlordId,
                        landlordEmail: landlord.email,
                        landlordName: `${landlord.firstName} ${landlord.lastName}`,
                        landlordPhone: landlord.phoneNumber,
                        amount,
                        bankOrNetwork,
                        accountNumber,
                    }).catch((e) => console.error('[Payout Notification Error]', e));
                }
                console.log(`[Payout] Transfer ${status} for landlord ${landlordId}, ref: ${transferRef}`);
            }
            catch (transferErr) {
                console.error('[Payout] Transfer failed:', transferErr?.response?.data || transferErr.message);
                await prisma_1.default.payoutRequest.update({
                    where: { id: payout.id },
                    data: {
                        status: 'FAILED',
                        failureReason: transferErr?.response?.data?.message || 'Paystack transfer failed',
                    },
                });
            }
        });
        res.status(201).json({
            message: 'Withdrawal request submitted. Funds will arrive within minutes.',
            payout,
        });
    }
    catch (error) {
        console.error('[Payout] requestPayout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.requestPayout = requestPayout;
// ─── GET /api/v1/payouts/history ────────────────────────────────────────────
const getPayoutHistory = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        if (!landlordId || req.user?.role !== 'LANDLORD') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const sysConfig = await (0, config_service_1.getSystemConfig)();
        const commissionPct = sysConfig.platformCommissionPercent || 5.0;
        const [transactions, payouts] = await Promise.all([
            prisma_1.default.transaction.findMany({ where: { landlordId, status: 'SUCCESS' } }),
            prisma_1.default.payoutRequest.findMany({
                where: { landlordId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const totalNetEarnings = transactions.reduce((acc, tx) => {
            return acc + (tx.amount - (tx.amount * commissionPct) / 100);
        }, 0);
        const totalPaidOut = payouts
            .filter((p) => ['PENDING', 'PROCESSING', 'SUCCESS'].includes(p.status))
            .reduce((acc, p) => acc + p.amount, 0);
        const availableBalance = Math.max(0, totalNetEarnings - totalPaidOut);
        res.status(200).json({
            summary: {
                totalNetEarnings,
                totalPaidOut,
                availableBalance,
                platformCommissionPercent: commissionPct,
            },
            payouts,
        });
    }
    catch (error) {
        console.error('[Payout] getPayoutHistory error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPayoutHistory = getPayoutHistory;
// ─── Paystack Transfer Webhook Handler (transfer.success / transfer.failed) ─
const handleTransferWebhook = async (req, res) => {
    try {
        const { event, data } = req.body;
        if (event === 'transfer.success' || event === 'transfer.failed') {
            const ref = data?.reference;
            if (ref?.startsWith('akwaaba-payout-')) {
                const payout = await prisma_1.default.payoutRequest.findFirst({
                    where: { transferReference: ref },
                });
                if (payout) {
                    await prisma_1.default.payoutRequest.update({
                        where: { id: payout.id },
                        data: {
                            status: event === 'transfer.success' ? 'SUCCESS' : 'FAILED',
                            failureReason: event === 'transfer.failed' ? (data?.reason || 'Transfer failed') : null,
                            processedAt: event === 'transfer.success' ? new Date() : null,
                        },
                    });
                }
            }
        }
        res.sendStatus(200);
    }
    catch (err) {
        console.error('[Payout Webhook]', err);
        res.sendStatus(200); // Always 200 to Paystack
    }
};
exports.handleTransferWebhook = handleTransferWebhook;
//# sourceMappingURL=payout.controller.js.map