import { Router } from 'express';
import { getCommuteInfo } from '../controllers/gis.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get commute information for a specific property relative to the tenant's campus
router.get('/commute/:propertyId', getCommuteInfo);

export default router;
