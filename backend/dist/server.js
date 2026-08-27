"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ─── Startup environment validation ─────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'PAYSTACK_SECRET_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}
if (process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET === 'akwaaba_super_secret_jwt_key_2026_dev') {
    console.error('❌ Refusing to start in production with a development JWT secret!');
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
const rateLimiter_middleware_1 = require("./middleware/rateLimiter.middleware");
const xss_middleware_1 = require("./middleware/xss.middleware");
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const config_middleware_1 = require("./middleware/config.middleware");
const config_service_1 = require("./utils/config.service");
const prisma_1 = __importDefault(require("./utils/prisma"));
const http_1 = require("http");
const socket_1 = require("./socket");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
// ─── Disable X-Powered-By Header ─────────────────────────────────────────────
app.disable('x-powered-by');
// ─── Initialize Socket.io ────────────────────────────────────────────────────
(0, socket_1.initializeSocket)(httpServer);
// ─── Trust proxy (Render / Vercel / Railway) ────────────────────────────────
app.set('trust proxy', 1);
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
// ─── CORS (allowlist-based) ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow server-to-server (no origin) and listed origins
        if (!origin || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
            callback(null, true);
        }
        else {
            console.warn(`⚠️  Blocked CORS request from: ${origin}`);
            callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // Cache preflight result for 24 hours
}));
// ─── Body parsing & cookies ──────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
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
// ─── Health Check (unthrottled) ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});
// ─── Global Rate Limiting + Speed Limiter ────────────────────────────────────
app.use('/api', rateLimiter_middleware_1.speedLimiter);
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
            maintenanceEndTime: config.maintenanceEndTime
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
app.use('/api/v1/chat', chat_routes_1.default);
app.use('/api/v1/agreements', agreement_routes_1.default);
app.use('/api/v1/breaches', breach_routes_1.default);
app.use('/api/v1/transactions', transaction_routes_1.default);
app.use('/api/v1/push', push_routes_1.default);
app.use('/api/v1/fraud', fraud_routes_1.default);
app.use('/api/v1/payouts', payout_routes_1.default);
app.use('/api/v1/wishlist', wishlist_routes_1.default);
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
// ─── Graceful shutdown on SIGTERM (Render / Docker) ─────────────────────────
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received — starting graceful shutdown...');
    httpServer.close(() => {
        console.log('✅ HTTP server closed.');
        process.exit(0);
    });
});
const bookingCleanup_1 = require("./utils/bookingCleanup");
httpServer.listen(port, () => {
    console.log(`✅ Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
    // Initial startup cleanup for expired bed reservations
    (0, bookingCleanup_1.cleanupExpiredBookings)().catch(console.error);
    // Periodic background cleanup every 2 minutes
    setInterval(() => {
        (0, bookingCleanup_1.cleanupExpiredBookings)().catch(console.error);
    }, 2 * 60 * 1000);
});
//# sourceMappingURL=server.js.map