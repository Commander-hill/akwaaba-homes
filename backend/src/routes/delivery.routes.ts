import { Router } from 'express';
import { logPackageDelivery, getTenantDeliveries, confirmParcelPickup } from '../controllers/delivery.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', logPackageDelivery);
router.get('/', getTenantDeliveries);
router.patch('/:id/collect', confirmParcelPickup);

export default router;
