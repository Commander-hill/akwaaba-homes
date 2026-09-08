import { Router } from 'express';
import { 
  requestLeaseRenewal, 
  getTenantRenewals, 
  getLandlordRenewals, 
  respondLeaseRenewal 
} from '../controllers/leaseRenewal.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', requestLeaseRenewal);
router.get('/', getTenantRenewals);
router.get('/landlord/mine', getLandlordRenewals);
router.patch('/:id/respond', respondLeaseRenewal);

export default router;
