import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendPushToUser } from '../services/push.service';
import { getIO } from '../socket';

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find all conversations where this user is either participant
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { tenantId: userId },
          { landlordId: userId }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Latest message for thread preview
        },
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Resolve the other participant's profile, unread count, and tenancy/property context
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const partnerId = conv.tenantId === userId ? conv.landlordId : conv.tenantId;

        const [partner, unreadCount, sharedBooking] = await Promise.all([
          prisma.user.findUnique({
            where: { id: partnerId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              role: true,
              isVerifiedLandlord: true,
              phoneNumber: true,
              ghanaCardStatus: true
            }
          }),
          prisma.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              isRead: false
            }
          }),
          prisma.booking.findFirst({
            where: {
              tenantId: conv.tenantId,
              property: { landlordId: conv.landlordId }
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              property: { select: { id: true, title: true, location: true } },
              room: { select: { roomType: true } }
            }
          })
        ]);

        let contextProperty = sharedBooking?.property || null;
        if (!contextProperty) {
          contextProperty = await prisma.property.findFirst({
            where: { landlordId: conv.landlordId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, location: true }
          });
        }

        // Only expose phoneNumber if there is an active/approved/completed booking between them
        const canSharePhone =
          sharedBooking &&
          ['APPROVED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(sharedBooking.status);

        return {
          ...conv,
          unreadCount,
          partner: partner
            ? {
                ...partner,
                phoneNumber: canSharePhone ? partner.phoneNumber : null
              }
            : null,
          contextBooking: sharedBooking
            ? {
                id: sharedBooking.id,
                status: sharedBooking.status,
                roomType: sharedBooking.room?.roomType || null,
                property: sharedBooking.property
              }
            : null,
          contextProperty
        };
      })
    );

    res.status(200).json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversationId = String(req.params.conversationId);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (conversation.tenantId !== userId && conversation.landlordId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });

    // Mark unread messages from the OTHER user as read
    const updateRes = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });

    if (updateRes.count > 0) {
      try {
        const io = getIO();
        const otherUserId =
          conversation.tenantId === userId ? conversation.landlordId : conversation.tenantId;
        io.to(conversationId).emit('messages_read', { conversationId, readerId: userId });
        io.to(otherUserId).emit('messages_read', { conversationId, readerId: userId });
      } catch (e) { /* non-blocking */ }
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerId } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !partnerId) {
      res.status(400).json({ message: 'Missing user or partner ID' });
      return;
    }

    // Check if conversation already exists in either direction
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { tenantId: userId, landlordId: partnerId },
          { tenantId: partnerId, landlordId: userId }
        ]
      }
    });

    if (!conversation) {
      const partnerUser = await prisma.user.findUnique({
        where: { id: partnerId },
        select: { role: true }
      });

      let tenantId = userId;
      let landlordId = partnerId;

      // Ensure proper role positioning if one is a landlord and one is a tenant
      if (role === 'LANDLORD' || partnerUser?.role === 'TENANT') {
        tenantId = partnerId;
        landlordId = userId;
      }

      conversation = await prisma.conversation.create({
        data: { tenantId, landlordId }
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversationId = String(req.params.conversationId);
    const { content, mediaUrl, mediaType, fileName, duration } = req.body;
    const userId = req.user?.id;

    if (!userId || (!content && !mediaUrl)) {
      res.status(400).json({ message: 'Missing message content or media file' });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (conversation.tenantId !== userId && conversation.landlordId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: content || (mediaType === 'AUDIO' ? '🎤 Voice note' : mediaType === 'IMAGE' ? '📷 Photo' : '📄 Document'),
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || 'TEXT',
        fileName: fileName || null,
        duration: duration ? parseInt(duration, 10) : null
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // Trigger Web Push to recipient
    const recipientId = conversation.tenantId === userId ? conversation.landlordId : conversation.tenantId;
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Direct Message';
    const previewContent = message.content;

    sendPushToUser(recipientId, {
      title: `Message from ${senderName}`,
      body: previewContent.length > 70 ? `${previewContent.substring(0, 67)}...` : previewContent,
      url: `/dashboard/messages`
    }).catch(() => {});

    try {
      const io = getIO();
      io.to(conversationId).emit('receive_message', message);
      io.to(recipientId).emit('receive_message', message);
      io.to(recipientId).emit('conversation_updated', { conversationId });
      io.to(userId).emit('conversation_updated', { conversationId });
    } catch (e) { /* non-blocking */ }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
