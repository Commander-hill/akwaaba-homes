import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { reportBreach, getBreachReports, verifyBreach } from '../controllers/breach.controller';

const router = Router();

// Landlords, Caretakers, and Admins can report breaches/citations
router.post('/report', authenticate, authorizeRole(['LANDLORD', 'CARETAKER', 'ADMIN']), reportBreach);
// Landlords can view their reported breaches, Tenants can view their own breaches
router.get('/', authenticate, getBreachReports);
// Admins can verify/reject breaches
router.post('/:id/verify', authenticate, authorizeRole(['ADMIN']), verifyBreach);

export default router;
