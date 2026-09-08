import { Router } from 'express';
import { 
  logPackageDelivery, 
  getTenantDeliveries, 
  getPropertyDeliveries, 
  confirmParcelPickup 
} from '../controllers/delivery.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', logPackageDelivery);
router.get('/', getTenantDeliveries);
router.get('/property', getPropertyDeliveries);
router.patch('/:id/collect', confirmParcelPickup);

export default router;
