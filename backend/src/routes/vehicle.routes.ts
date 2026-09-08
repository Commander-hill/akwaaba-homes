import { Router } from 'express';
import { 
  registerVehicle, 
  getTenantVehicles, 
  deleteVehicle, 
  verifyVehiclePlate, 
  getPropertyVehicles 
} from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', registerVehicle);
router.get('/', getTenantVehicles);
router.get('/verify', verifyVehiclePlate);
router.get('/property/:propertyId', getPropertyVehicles);
router.delete('/:id', deleteVehicle);

export default router;
