import { Router } from 'express';
import { getActiveNotices } from '../controllers/notice.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Allow any authenticated user (or even public if desired, but let's stick to authenticated tenants/landlords)
router.use(authenticate);

router.get('/', getActiveNotices);

export default router;
