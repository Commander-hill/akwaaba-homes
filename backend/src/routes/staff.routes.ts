import { Router } from 'express';
import { assignStaff, getPropertyStaff, removeStaff, getMyStaffAssignments } from '../controllers/staff.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', assignStaff);
router.get('/mine', getMyStaffAssignments);
router.get('/me', getMyStaffAssignments);
router.get('/assignments', getMyStaffAssignments);
router.get('/', getPropertyStaff);
router.delete('/:id', removeStaff);

export default router;
