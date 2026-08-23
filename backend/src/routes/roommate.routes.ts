import { Router } from 'express';
import { createOrUpdateProfile, getProfile, findMatches } from '../controllers/roommate.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { checkRoommateFeatureEnabled } from '../middleware/config.middleware';

const router = Router();

// All routes require feature flag check, authentication and TENANT role
router.use(checkRoommateFeatureEnabled, authenticate, authorizeRole(['TENANT']));

router.post('/profile', createOrUpdateProfile);
router.get('/profile', getProfile);
router.get('/matches', findMatches);

export default router;
