import { Router } from 'express';
import { getPublicKey, subscribe, unsubscribe, sendTestPush } from '../controllers/push.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/public-key', getPublicKey);
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.post('/test', authenticate, sendTestPush);

export default router;
