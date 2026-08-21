import { Router } from 'express';
import { createTicket, getTenantTickets, getLandlordTickets, updateTicketStatus } from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// Tenant routes
router.post('/', createTicket);
router.get('/me', getTenantTickets);

// Landlord routes
router.get('/landlord', getLandlordTickets);
router.patch('/:id/status', updateTicketStatus);

export default router;
