import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import prisma from './utils/prisma';
import jwt from 'jsonwebtoken';
import { parseCookie } from 'cookie';

interface SocketUser {
  id: string;
  role: string;
  exp?: number;
}

// Extend Socket interface to include user
declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

let io: Server;

export const initializeSocket = (server: HttpServer) => {
  io = new Server(server, {
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
        const cookies = parseCookie(socket.handshake.headers.cookie);
        token = cookies?.accessToken || '';
      } catch (e) {
        // ignore cookie parse error
      }
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as SocketUser;
        socket.user = decoded;
      } catch (err: any) {
        console.warn(`🔌 Socket token verification failed for socket ${socket.id}: ${err.message}`);
      }
    }

    // Always allow connection so clients don't loop endlessly with reconnect errors
    next();
  });

  io.on('connection', (socket: Socket) => {
    if (socket.user?.id) {
      console.log(`🔌 User connected: ${socket.user.id} (${socket.user.role})`);
      socket.join(socket.user.id);
      
      if (socket.user.role === 'ADMIN' || socket.user.role === 'SUPER_ADMIN') {
        socket.join('admin_room');
      }
      if (socket.user.role === 'LANDLORD') {
        socket.join('landlord_room');
      }
    } else {
      console.log(`🔌 Guest/Public Socket connected: ${socket.id}`);
    }

    // Join general broadcast room for platform-wide events
    socket.join('public_room');

    // Schedule automatic disconnect when token expires
    let expiryTimer: NodeJS.Timeout | null = null;
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

    // Join a specific conversation room (optional, but good for keeping track of active chats)
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(conversationId);
      console.log(`User ${socket.user?.id} joined conversation ${conversationId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data: { conversationId: string, receiverId: string, content: string }) => {
      try {
        const { conversationId, receiverId, content } = data;
        const senderId = socket.user!.id;

        // Save message to database
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId,
            content,
            isRead: false,
          }
        });

        // Update the conversation's updatedAt timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() }
        });

        // Emit the message to the receiver's personal room and the conversation room
        // We emit to the conversation room so the sender's other devices see it, 
        // and to the receiver's personal room in case they haven't "joined" the conversation yet.
        io.to(conversationId).emit('receive_message', message);
        io.to(receiverId).emit('receive_message', message);
        
      } catch (error) {
        console.error('Error sending message via socket:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data: { conversationId: string, receiverId: string }) => {
      socket.to(data.conversationId).emit('typing', { senderId: socket.user!.id });
    });

    socket.on('stop_typing', (data: { conversationId: string, receiverId: string }) => {
      socket.to(data.conversationId).emit('stop_typing', { senderId: socket.user!.id });
    });

    socket.on('disconnect', () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      console.log(`🔌 User disconnected: ${socket.user?.id}`);
    });
  });

  return io;
};

// Export a getter for the IO instance if we ever need to emit events from controllers
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};

// Safe helper to emit an event to a specific user room
export const emitToUser = (userId: string, event: string, payload: any) => {
  try {
    if (io) {
      io.to(userId).emit(event, payload);
    }
  } catch (err) {
    console.error(`Failed to emit socket event ${event} to user ${userId}:`, err);
  }
};

// Safe helper to broadcast an event to all connected sockets
export const emitToAll = (event: string, payload: any) => {
  try {
    if (io) {
      io.emit(event, payload);
    }
  } catch (err) {
    console.error(`Failed to broadcast socket event ${event}:`, err);
  }
};
