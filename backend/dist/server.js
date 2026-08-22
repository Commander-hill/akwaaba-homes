"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const property_routes_1 = __importDefault(require("./routes/property.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
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
const rateLimiter_middleware_1 = require("./middleware/rateLimiter.middleware");
const xss_middleware_1 = require("./middleware/xss.middleware");
const http_1 = require("http");
const socket_1 = require("./socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const port = process.env.PORT || 5000;
// Initialize Socket.io
(0, socket_1.initializeSocket)(httpServer);
// Trust proxy for Render deployment (needed for rate limiting and cookies)
app.set('trust proxy', 1);
// Strict HTTP Header Protection
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false, // Allow serving images cross-origin
}));
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow any origin that matches FRONTEND_URL or localhost, regardless of trailing slashes
        callback(null, true);
    },
    credentials: true
})); // Important for HTTP-only cookies
app.use(express_1.default.json({ limit: '10mb' })); // Increase limit for Base64 signatures
app.use((0, cookie_parser_1.default)());
// Apply Global XSS Protection
app.use(xss_middleware_1.xssSanitizer);
// Serve static files from the public directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Basic health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running' });
});
// Apply global rate limiting to all API routes
app.use('/api', rateLimiter_middleware_1.apiRateLimiter);
// API Routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/properties', property_routes_1.default);
app.use('/api/v1/bookings', booking_routes_1.default);
app.use('/api/v1/reviews', review_routes_1.default);
app.use('/api/v1/subscriptions', subscription_routes_1.default);
app.use('/api/v1/admin', admin_routes_1.default);
app.use('/api/v1/tickets', ticket_routes_1.default);
app.use('/api/v1/roommates', roommate_routes_1.default);
app.use('/api/v1/gis', gis_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
app.use('/api/v1/notices', notice_routes_1.default);
app.use('/api/v1/upload', upload_routes_1.default);
app.use('/api/v1/chat', chat_routes_1.default);
app.use('/api/v1/agreements', agreement_routes_1.default);
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=server.js.map