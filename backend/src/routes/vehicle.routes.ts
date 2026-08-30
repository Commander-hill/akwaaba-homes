import { Router } from 'express';
import { registerVehicle, getTenantVehicles, deleteVehicle } from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', registerVehicle);
router.get('/', getTenantVehicles);
router.delete('/:id', deleteVehicle);

export default router;
