import { Router } from 'express';
import { scanFraudRisk, resolveFraudAction } from '../controllers/fraud.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Only ADMIN can run AI Fraud scans and moderate risk flags
router.get('/scan', authenticate, authorizeRole(['ADMIN']), scanFraudRisk);
router.post('/resolve', authenticate, authorizeRole(['ADMIN']), resolveFraudAction);

export default router;
