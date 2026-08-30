import { Router } from 'express';
import { getPropertyOccupancyMatrix, updateBedStatus } from '../controllers/occupancy.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/property/:propertyId', getPropertyOccupancyMatrix);
router.patch('/beds/:bedId/status', updateBedStatus);

export default router;
