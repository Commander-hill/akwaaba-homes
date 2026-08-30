import { Router } from 'express';
import { requestLeaseRenewal, getTenantRenewals } from '../controllers/leaseRenewal.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', requestLeaseRenewal);
router.get('/', getTenantRenewals);

export default router;
