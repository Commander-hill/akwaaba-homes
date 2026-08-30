import { Router } from 'express';
import { createVisitorPass, getTenantVisitorPasses, revokeVisitorPass, verifyGatePass } from '../controllers/visitorPass.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createVisitorPass);
router.get('/', getTenantVisitorPasses);
router.patch('/:id/revoke', revokeVisitorPass);
router.post('/verify', verifyGatePass);

export default router;
