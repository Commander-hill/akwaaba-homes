import { Router } from 'express';
import { createBillSplit, getTenantBillSplits, toggleParticipantPaidStatus } from '../controllers/billSplit.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createBillSplit);
router.get('/', getTenantBillSplits);
router.patch('/participants/:participantId/status', toggleParticipantPaidStatus);

export default router;
