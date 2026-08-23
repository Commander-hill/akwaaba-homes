import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// ─── Startup environment validation ─────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'PAYSTACK_SECRET_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (
  process.env.NODE_ENV === 'production' &&
  process.env.JWT_SECRET === 'akwaaba_super_secret_jwt_key_2026_dev'
) {
  console.error('❌ Refusing to start in production with a development JWT secret!');
  process.exit(1);
}

import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import authRoutes from './routes/auth.routes';
import propertyRoutes from './routes/property.routes';
import bookingRoutes from './routes/booking.routes';
import roomRoutes from './routes/room.routes';
import reviewRoutes from './routes/review.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';
import ticketRoutes from './routes/ticket.routes';
import roommateRoutes from './routes/roommate.routes';
import gisRoutes from './routes/gis.routes';
import notificationRoutes from './routes/notification.routes';
import noticeRoutes from './routes/notice.routes';
import uploadRoutes from './routes/upload.routes';
import chatRoutes from './routes/chat.routes';
import agreementRoutes from './routes/agreement.routes';
import breachRoutes from './routes/breach.routes';
import transactionRoutes from './routes/transaction.routes';

import { apiRateLimiter, speedLimiter, adminRateLimiter, uploadRateLimiter } from './middleware/rateLimiter.middleware';
import { xssSanitizer } from './middleware/xss.middleware';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.middleware';

import { createServer } from 'http';
import { initializeSocket } from './socket';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ─── Initialize Socket.io ────────────────────────────────────────────────────
initializeSocket(httpServer);

// ─── Trust proxy (Render / Vercel / Railway) ────────────────────────────────
app.set('trust proxy', 1);

// ─── HTTP Security Headers (Helmet) ─────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin images
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Paystack popup support
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://js.paystack.co'],
            frameSrc: ["'self'", 'https://checkout.paystack.com'],
            imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
            connectSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        }
      : false, // Disable CSP in dev to avoid breaking hot-reload
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// ─── CORS (allowlist-based) ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) and listed origins
      if (!origin || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        console.warn(`⚠️  Blocked CORS request from: ${origin}`);
        callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // Cache preflight result for 24 hours
  })
);

// ─── Body parsing & cookies ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── HTTP Compression ────────────────────────────────────────────────────────
app.use(compression());

// ─── HTTP Request Logging ────────────────────────────────────────────────────
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ─── XSS Sanitisation ───────────────────────────────────────────────────────
app.use(xssSanitizer);

// ─── Static Files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── Health Check (unthrottled) ──────────────────────────────────────────────
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Rate Limiting + Speed Limiter ────────────────────────────────────
app.use('/api', speedLimiter);
app.use('/api', apiRateLimiter);

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/admin', adminRateLimiter, adminRoutes);       // Tighter limit for admin
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/roommates', roommateRoutes);
app.use('/api/v1/gis', gisRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/upload', uploadRateLimiter, uploadRoutes);    // Upload-specific limit
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/agreements', agreementRoutes);
app.use('/api/v1/breaches', breachRoutes);
app.use('/api/v1/transactions', transactionRoutes);

// ─── 404 & Global Error Handlers (must be LAST) ──────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Unhandled rejections / exceptions ──────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  console.error('🔥 Unhandled Promise Rejection:', reason);
  // Graceful shutdown: allow in-flight requests to finish (5s) then exit
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err: Error) => {
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

httpServer.listen(port, () => {
  console.log(`✅ Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
});
