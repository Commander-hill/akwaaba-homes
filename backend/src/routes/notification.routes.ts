import { Router } from 'express';
import { getMyNotifications, markAsRead, markAllAsRead, broadcastAnnouncement } from '../controllers/notification.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// User routes
router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all/all', markAllAsRead);

// Admin-only broadcast
router.post('/broadcast', authorizeRole(['ADMIN']), broadcastAnnouncement);

export default router;
