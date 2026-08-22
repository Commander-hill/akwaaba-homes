import { Router } from 'express';
import { createOrUpdateProfile, getProfile, findMatches } from '../controllers/roommate.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication and TENANT role
router.use(authenticate, authorizeRole(['TENANT']));

router.post('/profile', createOrUpdateProfile);
router.get('/profile', getProfile);
router.get('/matches', findMatches);

export default router;
