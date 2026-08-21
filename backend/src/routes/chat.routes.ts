import { Router } from 'express';
import { getConversations, getMessages, createConversation } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate); // All chat routes require authentication

router.get('/conversations', getConversations);
router.get('/:conversationId/messages', getMessages);
router.post('/conversations', createConversation);

export default router;
