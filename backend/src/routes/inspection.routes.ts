import { Router } from 'express';
import { 
  createOrUpdateInspection, 
  getBookingInspections,
  getPropertyInventory,
  savePropertyInventory 
} from '../controllers/inspection.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createOrUpdateInspection);
router.get('/booking/:bookingId', getBookingInspections);

// Property Master Asset Vault routes
router.get('/property/:propertyId/inventory', getPropertyInventory);
router.post('/property/:propertyId/inventory', savePropertyInventory);

export default router;
