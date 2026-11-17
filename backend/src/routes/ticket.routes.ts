import { Router } from 'express';
import {
  createTicket,
  getTenantTickets,
  getLandlordTickets,
  updateTicketStatus,
  checkAndEscalateTickets,
  getAdminEscalatedTickets,
  getTicketById,
  addTicketNote
} from '../controllers/ticket.controller';
import { authenticate, authorizeRole, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// Static collection & role-scoped routes first (before parameterized /:id)
router.post('/', createTicket);
router.get('/me', getTenantTickets);
router.get('/landlord', authorizeRole(['LANDLORD', 'CARETAKER', 'STAFF', 'ADMIN']), getLandlordTickets);

// Admin & Escalation routes
router.post('/check-escalations', requireAdmin, checkAndEscalateTickets);
router.get('/admin/escalated', requireAdmin, getAdminEscalatedTickets);

// Parameterized ticket details & status routes
router.get('/:id', getTicketById);
router.post('/:id/notes', addTicketNote);
router.patch('/:id/status', authorizeRole(['LANDLORD', 'CARETAKER', 'STAFF', 'ADMIN']), updateTicketStatus);

export default router;
