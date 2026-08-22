import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import cookieParser from 'cookie-parser';
import helmet from 'helmet';
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
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { xssSanitizer } from './middleware/xss.middleware';
import prisma from './utils/prisma';

import { createServer } from 'http';
import { initializeSocket } from './socket';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 5000;

// Initialize Socket.io
initializeSocket(httpServer);

// Trust proxy for Render deployment (needed for rate limiting and cookies)
app.set('trust proxy', 1);

// Strict HTTP Header Protection
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow serving images cross-origin
}));

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow any origin that matches FRONTEND_URL or localhost, regardless of trailing slashes
    callback(null, true); 
  }, 
  credentials: true 
})); // Important for HTTP-only cookies
app.use(express.json({ limit: '10mb' })); // Increase limit for Base64 signatures
app.use(cookieParser());

// Apply Global XSS Protection
app.use(xssSanitizer);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Basic health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// Apply global rate limiting to all API routes
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/roommates', roommateRoutes);
app.use('/api/v1/gis', gisRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/agreements', agreementRoutes);
app.use('/api/v1/breaches', breachRoutes);
app.use('/api/v1/transactions', transactionRoutes);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
