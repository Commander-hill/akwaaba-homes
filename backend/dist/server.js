"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// If REFRESH_JWT_SECRET is missing, safely fallback to JWT_SECRET
if (!process.env.REFRESH_JWT_SECRET && process.env.JWT_SECRET) {
    process.env.REFRESH_JWT_SECRET = process.env.JWT_SECRET;
}
// Strictly required variables to initialize server, database, and cryptographic subsystems
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
    console.error(`❌ FATAL: Missing critical security environment variables: ${missing.join(', ')}`);
    process.exit(1);
}
// Enforce independent, high-entropy ENCRYPTION_KEY validation
if (process.env.ENCRYPTION_KEY) {
    const encKey = process.env.ENCRYPTION_KEY.trim();
    const is64Hex = /^[0-9a-fA-F]{64}$/.test(encKey);
    const is32Bytes = Buffer.from(encKey, 'utf8').length === 32;
    if (process.env.NODE_ENV === 'production') {
        if (!is64Hex && !is32Bytes) {
            console.error('❌ FATAL: Production requires an independent, 64-character hex or 32-byte ENCRYPTION_KEY. Terminating process.');
            process.exit(1);
        }
        if (encKey === process.env.JWT_SECRET) {
            console.error('❌ FATAL: ENCRYPTION_KEY must be an independent secret and cannot be identical to JWT_SECRET. Terminating process.');
            process.exit(1);
        }
    }
}
if (!process.env.PAYSTACK_SECRET_KEY) {
    console.warn('⚠️ Notice: PAYSTACK_SECRET_KEY not set. Financial transactions will require configuration.');
}
if (process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET.includes('dev') ||
        process.env.JWT_SECRET.includes('fallback') ||
        process.env.JWT_SECRET.length < 32)) {
    console.error('❌ FATAL: Production requires a secure, high-entropy JWT_SECRET (minimum 32 characters, non-default). Terminating process.');
    process.exit(1);
}
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const property_routes_1 = __importDefault(require("./routes/property.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const room_routes_1 = __importDefault(require("./routes/room.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const ticket_routes_1 = __importDefault(require("./routes/ticket.routes"));
const roommate_routes_1 = __importDefault(require("./routes/roommate.routes"));
const gis_routes_1 = __importDefault(require("./routes/gis.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const notice_routes_1 = __importDefault(require("./routes/notice.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const agreement_routes_1 = __importDefault(require("./routes/agreement.routes"));
const breach_routes_1 = __importDefault(require("./routes/breach.routes"));
const transaction_routes_1 = __importDefault(require("./routes/transaction.routes"));
const push_routes_1 = __importDefault(require("./routes/push.routes"));
const fraud_routes_1 = __importDefault(require("./routes/fraud.routes"));
const payout_routes_1 = __importDefault(require("./routes/payout.routes"));
const wishlist_routes_1 = __importDefault(require("./routes/wishlist.routes"));
const occupancy_routes_1 = __importDefault(require("./routes/occupancy.routes"));
const expense_routes_1 = __importDefault(require("./routes/expense.routes"));
const compoundNotice_routes_1 = __importDefault(require("./routes/compoundNotice.routes"));
const inspection_routes_1 = __importDefault(require("./routes/inspection.routes"));
const staff_routes_1 = __importDefault(require("./routes/staff.routes"));
const visitorPass_routes_1 = __importDefault(require("./routes/visitorPass.routes"));
const serviceBooking_routes_1 = __importDefault(require("./routes/serviceBooking.routes"));
const vehicle_routes_1 = __importDefault(require("./routes/vehicle.routes"));
const leaseRenewal_routes_1 = __importDefault(require("./routes/leaseRenewal.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const billSplit_routes_1 = __importDefault(require("./routes/billSplit.routes"));
const rateLimiter_middleware_1 = require("./middleware/rateLimiter.middleware");
const xss_middleware_1 = require("./middleware/xss.middleware");
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const config_middleware_1 = require("./middleware/config.middleware");
const config_service_1 = require("./utils/config.service");
const notification_service_1 = require("./utils/notification.service");
const prisma_1 = __importDefault(require("./utils/prisma"));
const http_1 = require("http");
const socket_1 = require("./socket");
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
// ─── Disable X-Powered-By Header ─────────────────────────────────────────────
app.disable('x-powered-by');
// ─── Initialize Socket.io ────────────────────────────────────────────────────
(0, socket_1.initializeSocket)(httpServer);
// ─── Trust proxy (Render / Vercel / Railway) ────────────────────────────────
app.set('trust proxy', 1);
// ─── Force HTTPS in Production ──────────────────────────────────────────────
app.use((req, res, next) => {
    if (isProduction && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});
// ─── HTTP Security Headers (Helmet + OWASP Standards) ─────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin images & assets
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Paystack popup support
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.paystack.co'],
            frameSrc: ["'self'", 'https://checkout.paystack.com', 'https://*.paystack.co'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.tile.openstreetmap.org', 'https://*.openstreetmap.org'],
            connectSrc: ["'self'", 'wss:', 'ws:', 'https://checkout.paystack.com', 'https://api.paystack.co'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"], // Anti-clickjacking
        },
    },
    hsts: {
        maxAge: 31536000, // 1 Year HSTS
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' }, // Anti-clickjacking
    noSniff: true, // Prevent MIME sniffing
    xssFilter: true, // XSS filter protection
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
// ─── Custom Security Headers (Permissions-Policy) ───────────────────────────
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(), payment=(self)');
    next();
});
// ─── CORS (strict allowlist-based) ──────────────────────────────────────────
const ALLOWED_ORIGIN_SET = new Set([
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://akwaaba-homes.vercel.app',
    'https://akwaaba-homes-three.vercel.app',
    'https://www.akwaabahomes.com',
    'https://akwaabahomes.com'
]
    .filter(Boolean)
    .map((url) => url.replace(/\/$/, '')));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow server-to-server or curl/mobile (no origin)
        if (!origin) {
            return callback(null, true);
        }
        const cleanOrigin = origin.replace(/\/$/, '');
        // Explicit exact match
        if (ALLOWED_ORIGIN_SET.has(cleanOrigin)) {
            return callback(null, true);
        }
        // Allow private LAN origins in development (e.g. mobile/tablet testing on 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const isPrivateNetwork = /^(http:\/\/|https:\/\/)?(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(cleanOrigin);
        if (isPrivateNetwork) {
            return callback(null, true);
        }
        // Strictly anchored official Akwaaba Vercel deployments & preview branches
        const isOfficialVercelPreview = /^https:\/\/(akwaaba-homes[a-z0-9-]*|[a-z0-9-]+-akwaaba-homes[a-z0-9-]*)\.vercel\.app$/.test(cleanOrigin);
        if (isOfficialVercelPreview) {
            return callback(null, true);
        }
        console.warn(`🚨 Blocked unauthorized CORS request from origin: ${origin}`);
        return callback(new Error(`CORS policy: Origin ${origin} is not authorized`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // Cache preflight result for 24 hours
}));
// ─── Body parsing & cookies (preserves rawBody for webhook HMAC verification) ──
app.use(express_1.default.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// ─── HTTP Compression ────────────────────────────────────────────────────────
app.use((0, compression_1.default)());
// ─── HTTP Request Logging ────────────────────────────────────────────────────
app.use((0, morgan_1.default)(isProduction ? 'combined' : 'dev'));
// ─── XSS Sanitisation ───────────────────────────────────────────────────────
app.use(xss_middleware_1.xssSanitizer);
// ─── Static Files ────────────────────────────────────────────────────────────
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'public/uploads')));
// ─── Health Check (unthrottled) ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        commit: process.env.RENDER_GIT_COMMIT || 'local-dev',
        uptime: Math.round(process.uptime()),
    });
});
// ─── Global Rate Limiting (High-Throughput Safe Ceiling) ───────────────────────
app.use('/api', rateLimiter_middleware_1.apiRateLimiter);
// ─── Global Maintenance Mode Check ──────────────────────────────────────────
app.use('/api', config_middleware_1.checkMaintenanceMode);
// ─── Public Config Route ──────────────────────────────────────────────────────
app.get('/api/v1/config/public', async (req, res) => {
    try {
        const config = await (0, config_service_1.getSystemConfig)();
        res.status(200).json({
            ghanaCardVerificationEnabled: config.ghanaCardVerificationEnabled,
            bookingGracePeriodHours: config.bookingGracePeriodHours,
            platformCommissionPercent: config.platformCommissionPercent,
            roommateFinderEnabled: config.roommateFinderEnabled,
            maintenanceMode: config.maintenanceMode,
            maintenanceEndTime: config.maintenanceEndTime,
            maintenanceStartTime: config.maintenanceStartTime,
            maintenanceScheduled: config.maintenanceScheduled,
            maintenanceTitle: config.maintenanceTitle || 'Scheduled Platform Maintenance',
            maintenanceMessage: config.maintenanceMessage || 'AkwaabaHomes is currently undergoing scheduled maintenance to upgrade our infrastructure and improve your rental experience. We will be back online shortly.',
            maintenanceScope: config.maintenanceScope || 'GLOBAL',
            maintenanceContactEmail: config.maintenanceContactEmail || 'support@akwaabahomes.com',
            maintenanceContactPhone: config.maintenanceContactPhone || '+233 24 000 0000',
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error reading config' });
    }
});
// ─── Maintenance Mode Email Subscription ─────────────────────────────────────
app.post('/api/v1/config/subscribe-maintenance', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            res.status(400).json({ message: 'A valid email address is required.' });
            return;
        }
        await prisma_1.default.maintenanceSubscriber.upsert({
            where: { email: email.trim().toLowerCase() },
            update: { notified: false },
            create: { email: email.trim().toLowerCase() }
        });
        res.status(200).json({ message: 'Subscribed successfully! You will be emailed the moment maintenance completes.' });
    }
    catch (err) {
        console.error('Error subscribing to maintenance notification:', err);
        res.status(500).json({ message: 'Failed to subscribe.' });
    }
});
// ─── Public Contact & Support Inquiry Endpoint ───────────────────────────────
app.post('/api/v1/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ message: 'Please provide your full name.' });
            return;
        }
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            res.status(400).json({ message: 'Please provide a valid email address.' });
            return;
        }
        if (!message || typeof message !== 'string' || message.trim().length < 5) {
            res.status(400).json({ message: 'Please describe your inquiry in at least 5 characters.' });
            return;
        }
        const referenceId = `INQ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        await (0, notification_service_1.notifyContactInquiry)({
            referenceId,
            name: name.trim(),
            email: email.trim(),
            phone: typeof phone === 'string' && phone.trim() ? phone.trim() : undefined,
            subject: typeof subject === 'string' && subject.trim() ? subject.trim() : 'TENANCY_INQUIRY',
            message: message.trim(),
            ipAddress
        });
        res.status(201).json({
            success: true,
            referenceId,
            message: `Your inquiry (${referenceId}) has been received by our Support Desk. We will respond via email or WhatsApp shortly.`
        });
    }
    catch (err) {
        console.error('Error submitting contact inquiry:', err);
        res.status(500).json({ message: 'Failed to submit inquiry. Please try again or call our hotline.' });
    }
});
// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/properties', property_routes_1.default);
app.use('/api/v1/rooms', room_routes_1.default);
app.use('/api/v1/bookings', booking_routes_1.default);
app.use('/api/v1/reviews', review_routes_1.default);
app.use('/api/v1/subscriptions', subscription_routes_1.default);
app.use('/api/v1/admin', rateLimiter_middleware_1.adminRateLimiter, admin_routes_1.default); // Tighter limit for admin
app.use('/api/v1/tickets', ticket_routes_1.default);
app.use('/api/v1/roommates', roommate_routes_1.default);
app.use('/api/v1/gis', gis_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
app.use('/api/v1/notices', notice_routes_1.default);
app.use('/api/v1/upload', rateLimiter_middleware_1.uploadRateLimiter, upload_routes_1.default); // Upload-specific limit
app.use('/api/upload', rateLimiter_middleware_1.uploadRateLimiter, upload_routes_1.default); // Backwards-compatible alias for signed document URLs
app.use('/api/v1/chat', chat_routes_1.default);
app.use('/api/v1/agreements', agreement_routes_1.default);
app.use('/api/v1/breaches', breach_routes_1.default);
app.use('/api/v1/transactions', transaction_routes_1.default);
app.use('/api/v1/push', push_routes_1.default);
app.use('/api/v1/fraud', fraud_routes_1.default);
app.use('/api/v1/payouts', payout_routes_1.default);
app.use('/api/v1/wishlist', wishlist_routes_1.default);
app.use('/api/v1/occupancy', occupancy_routes_1.default);
app.use('/api/v1/expenses', expense_routes_1.default);
app.use('/api/v1/compound-notices', compoundNotice_routes_1.default);
app.use('/api/v1/notices', compoundNotice_routes_1.default);
app.use('/api/v1/inspections', inspection_routes_1.default);
app.use('/api/v1/staff', staff_routes_1.default);
app.use('/api/v1/visitor-passes', visitorPass_routes_1.default);
app.use('/api/v1/service-bookings', serviceBooking_routes_1.default);
app.use('/api/v1/vehicles', vehicle_routes_1.default);
app.use('/api/v1/lease-renewals', leaseRenewal_routes_1.default);
app.use('/api/v1/deliveries', delivery_routes_1.default);
app.use('/api/v1/parcels', delivery_routes_1.default);
app.use('/api/v1/bill-splits', billSplit_routes_1.default);
app.use('/api/v1/billsplits', billSplit_routes_1.default);
// ─── 404 & Global Error Handlers (must be LAST) ──────────────────────────────
app.use(errorHandler_middleware_1.notFoundHandler);
app.use(errorHandler_middleware_1.globalErrorHandler);
// ─── Unhandled rejections / exceptions ──────────────────────────────────────
process.on('unhandledRejection', (reason) => {
    console.error('🔥 Unhandled Promise Rejection:', reason);
    // Graceful shutdown: allow in-flight requests to finish (5s) then exit
    httpServer.close(() => process.exit(1));
});
process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
    httpServer.close(() => process.exit(1));
});
// ─── Graceful shutdown on SIGTERM / SIGINT ──────────────────────────────────
const shutdownGracefully = (signal) => {
    console.log(`📴 ${signal} received — starting graceful shutdown...`);
    httpServer.close(() => {
        console.log('✅ HTTP server closed.');
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));
const bookingCleanup_1 = require("./utils/bookingCleanup");
if (process.env.NODE_ENV !== 'test') {
    let listenRetries = 0;
    const maxRetries = 5;
    httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && listenRetries < maxRetries) {
            listenRetries += 1;
            console.warn(`⏳ Port ${port} busy, retrying in 800ms (${listenRetries}/${maxRetries})...`);
            setTimeout(() => {
                httpServer.close();
                httpServer.listen(port);
            }, 800);
        }
        else {
            console.error('🔥 Server listen error:', err);
            process.exit(1);
        }
    });
    httpServer.listen(port, () => {
        console.log(`✅ Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
        // Initial startup cleanup for expired bed reservations
        (0, bookingCleanup_1.cleanupExpiredBookings)().catch(console.error);
        // Periodic background cleanup every 2 minutes
        setInterval(() => {
            (0, bookingCleanup_1.cleanupExpiredBookings)().catch(console.error);
        }, 2 * 60 * 1000);
    });
}
//# sourceMappingURL=server.js.map