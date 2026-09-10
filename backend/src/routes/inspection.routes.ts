import { Router } from 'express';
import { 
  createOrUpdateInspection, 
  getBookingInspections,
  getPropertyInventory,
  savePropertyInventory,
  getPropertyMeterReadings,
  savePropertyMeterReading
} from '../controllers/inspection.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createOrUpdateInspection);
router.get('/booking/:bookingId', getBookingInspections);

// Property Master Asset Vault routes
router.get('/property/:propertyId/inventory', getPropertyInventory);
router.post('/property/:propertyId/inventory', savePropertyInventory);

// Property Utility Sub-Meter Readings routes
router.get('/property/:propertyId/meters', getPropertyMeterReadings);
router.post('/property/:propertyId/meters', savePropertyMeterReading);

export default router;
