import { Router } from 'express';
import {
  createTicket,
  getTenantTickets,
  getLandlordTickets,
  updateTicketStatus,
  checkAndEscalateTickets,
  getAdminEscalatedTickets
} from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// Tenant routes
router.post('/', createTicket);
router.get('/me', getTenantTickets);

// Landlord & Multi-stage routes
router.get('/landlord', getLandlordTickets);
router.patch('/:id/status', updateTicketStatus);

// Admin & Escalation routes
router.post('/check-escalations', checkAndEscalateTickets);
router.get('/admin/escalated', getAdminEscalatedTickets);

export default router;
