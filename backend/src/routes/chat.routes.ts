import { Router } from 'express';
import { getConversations, getMessages, createConversation, sendMessage } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate); // All chat routes require authentication

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/:conversationId/messages', getMessages);
router.post('/:conversationId/messages', sendMessage);

export default router;
