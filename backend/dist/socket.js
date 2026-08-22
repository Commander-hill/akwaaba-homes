"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const prisma_1 = __importDefault(require("./utils/prisma"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookie_1 = require("cookie");
let io;
const initializeSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    // ... (in the middleware)
    io.use((socket, next) => {
        let token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        // If not found in headers, check cookies
        if (!token && socket.handshake.headers.cookie) {
            const cookies = (0, cookie_1.parseCookie)(socket.handshake.headers.cookie);
            token = cookies?.accessToken;
        }
        if (!token) {
            return next(new Error('Authentication error'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        }
        catch (err) {
            next(new Error('Authentication error'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.user?.id}`);
        // Join a personal room for the user to receive private messages
        socket.join(socket.user.id);
        // Join a specific conversation room (optional, but good for keeping track of active chats)
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${socket.user?.id} joined conversation ${conversationId}`);
        });
        // Handle sending messages
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, receiverId, content } = data;
                const senderId = socket.user.id;
                // Save message to database
                const message = await prisma_1.default.message.create({
                    data: {
                        conversationId,
                        senderId,
                        content,
                        isRead: false,
                    }
                });
                // Update the conversation's updatedAt timestamp
                await prisma_1.default.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() }
                });
                // Emit the message to the receiver's personal room and the conversation room
                // We emit to the conversation room so the sender's other devices see it, 
                // and to the receiver's personal room in case they haven't "joined" the conversation yet.
                io.to(conversationId).emit('receive_message', message);
                io.to(receiverId).emit('receive_message', message);
            }
            catch (error) {
                console.error('Error sending message via socket:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        // Handle typing indicators
        socket.on('typing', (data) => {
            socket.to(data.conversationId).emit('typing', { senderId: socket.user.id });
        });
        socket.on('stop_typing', (data) => {
            socket.to(data.conversationId).emit('stop_typing', { senderId: socket.user.id });
        });
        socket.on('disconnect', () => {
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
//# sourceMappingURL=socket.js.map