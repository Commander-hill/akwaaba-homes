import { Router } from 'express';
import { createOrUpdateProfile, getProfile, findMatches } from '../controllers/roommate.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/profile', createOrUpdateProfile);
router.get('/profile', getProfile);
router.get('/matches', findMatches);

export default router;
