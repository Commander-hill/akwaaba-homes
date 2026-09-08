"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToAll = exports.emitToUser = exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const prisma_1 = __importDefault(require("./utils/prisma"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookie_1 = require("cookie");
let io;
const initializeSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: true, // Allow any origin, reflecting it back (matches Express config)
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    io.use((socket, next) => {
        let rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        let token = '';
        if (rawToken) {
            token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
        }
        // If not found in auth object or authorization header, check cookies
        if (!token && socket.handshake.headers.cookie) {
            try {
                const cookies = (0, cookie_1.parse)(socket.handshake.headers.cookie);
                token = cookies?.accessToken || '';
            }
            catch (e) {
                // ignore cookie parse error
            }
        }
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                socket.user = decoded;
            }
            catch (err) {
                console.warn(`🔌 Socket token verification failed for socket ${socket.id}: ${err.message}`);
            }
        }
        // Always allow connection so clients don't loop endlessly with reconnect errors
        next();
    });
    io.on('connection', (socket) => {
        if (socket.user?.id) {
            console.log(`🔌 User connected: ${socket.user.id} (${socket.user.role})`);
            socket.join(socket.user.id);
            if (socket.user.role === 'ADMIN' || socket.user.role === 'SUPER_ADMIN') {
                socket.join('admin_room');
            }
            if (socket.user.role === 'LANDLORD') {
                socket.join('landlord_room');
            }
        }
        else {
            console.log(`🔌 Guest/Public Socket connected: ${socket.id}`);
        }
        // Join general broadcast room for platform-wide events
        socket.join('public_room');
        // Schedule automatic disconnect when token expires
        let expiryTimer = null;
        if (socket.user?.exp) {
            const timeUntilExpiry = (socket.user.exp * 1000) - Date.now();
            if (timeUntilExpiry > 0) {
                expiryTimer = setTimeout(() => {
                    console.log(`🔌 Socket auto-disconnected due to token expiration for user: ${socket.user?.id}`);
                    socket.emit('auth_expired', { message: 'Session token expired. Please refresh your session.' });
                    socket.disconnect(true);
                }, timeUntilExpiry);
            }
        }
        // Join a specific conversation room (strictly authorized)
        socket.on('join_conversation', async (conversationId) => {
            try {
                const userId = socket.user?.id;
                if (!userId) {
                    socket.emit('error', { message: 'Authentication required to join conversation' });
                    return;
                }
                const conv = await prisma_1.default.conversation.findUnique({
                    where: { id: conversationId },
                    select: { tenantId: true, landlordId: true }
                });
                if (!conv) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }
                const isAuthorized = conv.tenantId === userId || conv.landlordId === userId || socket.user?.role === 'ADMIN';
                if (!isAuthorized) {
                    console.warn(`🚨 Unauthorized socket room join attempt by user ${userId} for conversation ${conversationId}`);
                    socket.emit('error', { message: 'Forbidden: You are not a participant in this conversation' });
                    return;
                }
                socket.join(conversationId);
                console.log(`User ${userId} securely joined conversation ${conversationId}`);
            }
            catch (err) {
                console.error('Error joining conversation via socket:', err);
            }
        });
        // Handle sending messages (strictly authorized)
        socket.on('send_message', async (data) => {
            try {
                const senderId = socket.user?.id;
                if (!senderId) {
                    socket.emit('error', { message: 'Authentication required to send message' });
                    return;
                }
                const { conversationId, receiverId, content, mediaUrl, mediaType, fileName, duration } = data;
                if (!conversationId || (!content && !mediaUrl)) {
                    socket.emit('error', { message: 'Missing conversationId or content' });
                    return;
                }
                // Verify sender is participant of the conversation
                const conv = await prisma_1.default.conversation.findUnique({
                    where: { id: conversationId },
                    select: { tenantId: true, landlordId: true }
                });
                if (!conv) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }
                const isAuthorized = conv.tenantId === senderId || conv.landlordId === senderId || socket.user?.role === 'ADMIN';
                if (!isAuthorized) {
                    console.warn(`🚨 Unauthorized socket send_message attempt by user ${senderId} for conversation ${conversationId}`);
                    socket.emit('error', { message: 'Forbidden: You are not a participant in this conversation' });
                    return;
                }
                // Save message to database
                const message = await prisma_1.default.message.create({
                    data: {
                        conversationId,
                        senderId,
                        content: content || (mediaType === 'AUDIO' ? '🎤 Voice note' : mediaType === 'IMAGE' ? '📷 Photo' : '📄 Document'),
                        mediaUrl: mediaUrl || null,
                        mediaType: mediaType || 'TEXT',
                        fileName: fileName || null,
                        duration: duration || null,
                        isRead: false,
                    }
                });
                // Update the conversation's updatedAt timestamp
                await prisma_1.default.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() }
                });
                // Emit the message to the receiver's personal room and the conversation room
                io.to(conversationId).emit('receive_message', message);
                io.to(receiverId).emit('receive_message', message);
                io.to(receiverId).emit('conversation_updated', { conversationId });
                io.to(senderId).emit('conversation_updated', { conversationId });
            }
            catch (error) {
                console.error('Error sending message via socket:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        // Handle typing indicators (safe check)
        socket.on('typing', (data) => {
            if (socket.user?.id) {
                socket.to(data.conversationId).emit('typing', { senderId: socket.user.id });
            }
        });
        socket.on('stop_typing', (data) => {
            if (socket.user?.id) {
                socket.to(data.conversationId).emit('stop_typing', { senderId: socket.user.id });
            }
        });
        socket.on('disconnect', () => {
            if (expiryTimer)
                clearTimeout(expiryTimer);
            console.log(`🔌 User disconnected: ${socket.user?.id}`);
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
// Export a getter for the IO instance if we ever need to emit events from controllers
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized');
    }
    return io;
};
exports.getIO = getIO;
// Safe helper to emit an event to a specific user room
const emitToUser = (userId, event, payload) => {
    try {
        if (io) {
            io.to(userId).emit(event, payload);
        }
    }
    catch (err) {
        console.error(`Failed to emit socket event ${event} to user ${userId}:`, err);
    }
};
exports.emitToUser = emitToUser;
// Safe helper to broadcast an event to all connected sockets
const emitToAll = (event, payload) => {
    try {
        if (io) {
            io.emit(event, payload);
        }
    }
    catch (err) {
        console.error(`Failed to broadcast socket event ${event}:`, err);
    }
};
exports.emitToAll = emitToAll;
//# sourceMappingURL=socket.js.map