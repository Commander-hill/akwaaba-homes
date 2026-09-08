import { Router } from 'express';
import { 
  createVisitorPass, 
  getTenantVisitorPasses, 
  revokeVisitorPass, 
  verifyGatePass,
  checkOutVisitorPass,
  getPropertyVisitorPasses
} from '../controllers/visitorPass.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createVisitorPass);
router.get('/', getTenantVisitorPasses);
router.get('/property/:propertyId', getPropertyVisitorPasses);
router.patch('/:id/revoke', revokeVisitorPass);
router.patch('/:id/checkout', checkOutVisitorPass);
router.post('/verify', verifyGatePass);

export default router;
