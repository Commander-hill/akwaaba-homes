"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.createConversation = exports.getMessages = exports.getConversations = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const push_service_1 = require("../services/push.service");
const getConversations = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const role = req.user?.role;
        // Find all conversations where this user is either the tenant or landlord
        const conversations = await prisma_1.default.conversation.findMany({
            where: role === 'TENANT' ? { tenantId: userId } : { landlordId: userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1, // Just get the latest message for the preview
                },
            },
            orderBy: { updatedAt: 'desc' }
        });
        // We also need to fetch the other user's profile info (avatar, name)
        // Since Conversation doesn't have explicit relations to User built into schema yet (only IDs), 
        // we manually fetch the partner details.
        const formattedConversations = await Promise.all(conversations.map(async (conv) => {
            const partnerId = role === 'TENANT' ? conv.landlordId : conv.tenantId;
            const partner = await prisma_1.default.user.findUnique({
                where: { id: partnerId },
                select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true }
            });
            return {
                ...conv,
                partner
            };
        }));
        res.status(200).json(formattedConversations);
    }
    catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getConversations = getConversations;
const getMessages = async (req, res) => {
    try {
        const conversationId = String(req.params.conversationId);
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        // Verify user is part of the conversation
        const conversation = await prisma_1.default.conversation.findUnique({
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
        const messages = await prisma_1.default.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' }
        });
        // Mark unread messages from the OTHER user as read
        await prisma_1.default.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false
            },
            data: { isRead: true }
        });
        res.status(200).json(messages);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMessages = getMessages;
const createConversation = async (req, res) => {
    try {
        const { partnerId } = req.body;
        const userId = req.user?.id;
        const role = req.user?.role;
        if (!userId || !partnerId) {
            res.status(400).json({ message: 'Missing user or partner ID' });
            return;
        }
        const tenantId = role === 'TENANT' ? userId : partnerId;
        const landlordId = role === 'LANDLORD' ? userId : partnerId;
        // Check if conversation already exists
        let conversation = await prisma_1.default.conversation.findUnique({
            where: {
                tenantId_landlordId: { tenantId, landlordId }
            }
        });
        if (!conversation) {
            conversation = await prisma_1.default.conversation.create({
                data: { tenantId, landlordId }
            });
        }
        res.status(200).json(conversation);
    }
    catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createConversation = createConversation;
const sendMessage = async (req, res) => {
    try {
        const conversationId = String(req.params.conversationId);
        const { content, mediaUrl, mediaType, fileName, duration } = req.body;
        const userId = req.user?.id;
        if (!userId || (!content && !mediaUrl)) {
            res.status(400).json({ message: 'Missing message content or media file' });
            return;
        }
        const conversation = await prisma_1.default.conversation.findUnique({
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
        const message = await prisma_1.default.message.create({
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
        await prisma_1.default.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });
        // Trigger Web Push to recipient
        const recipientId = conversation.tenantId === userId ? conversation.landlordId : conversation.tenantId;
        const sender = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true }
        });
        const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Direct Message';
        const previewContent = message.content;
        (0, push_service_1.sendPushToUser)(recipientId, {
            title: `Message from ${senderName}`,
            body: previewContent.length > 70 ? `${previewContent.substring(0, 67)}...` : previewContent,
            url: `/dashboard/messages`
        }).catch(() => { });
        res.status(201).json(message);
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.sendMessage = sendMessage;
//# sourceMappingURL=chat.controller.js.map