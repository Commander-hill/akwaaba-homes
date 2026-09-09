import { Router } from 'express';
import { 
  createBillSplit, 
  getTenantBillSplits, 
  getPropertyBillSplits,
  toggleParticipantPaidStatus, 
  deleteBillSplit 
} from '../controllers/billSplit.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createBillSplit);
router.get('/', getTenantBillSplits);
router.get('/property/:propertyId', getPropertyBillSplits);
router.patch('/participants/:participantId/status', toggleParticipantPaidStatus);
router.delete('/:id', deleteBillSplit);

export default router;
