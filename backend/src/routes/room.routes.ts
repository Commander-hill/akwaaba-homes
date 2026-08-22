// @ts-nocheck
import { Router } from 'express';
import { createRoom, updateRoom, deleteRoom, getRoomsByProperty } from '../controllers/room.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/property/:propertyId', getRoomsByProperty);

// Landlord/Admin only routes
router.post('/', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), createRoom);
router.put('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), updateRoom);
router.delete('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), deleteRoom);

export default router;
