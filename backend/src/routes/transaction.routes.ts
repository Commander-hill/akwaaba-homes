import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { getLandlordCashflows } from '../controllers/transaction.controller';

const router = Router();

router.get('/landlord', authenticate, authorizeRole(['LANDLORD']), getLandlordCashflows);

export default router;
