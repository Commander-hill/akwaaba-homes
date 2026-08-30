import { Router } from 'express';
import { assignStaff, getPropertyStaff, removeStaff } from '../controllers/staff.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', assignStaff);
router.get('/', getPropertyStaff);
router.delete('/:id', removeStaff);

export default router;
