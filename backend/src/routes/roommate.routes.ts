import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import {
  getRoommateMatches,
  upsertRoommateProfile,
  sendRoommateInvitation,
  getMyRoommateInvitations,
  respondToRoommateInvitation
} from '../controllers/roommate.controller';

const router = Router();

router.use(authenticate);

router.get('/matches', getRoommateMatches);
router.post('/profile', upsertRoommateProfile);
router.post('/invite', sendRoommateInvitation);
router.get('/invitations', getMyRoommateInvitations);
router.put('/invitations/:id/respond', respondToRoommateInvitation);

export default router;
