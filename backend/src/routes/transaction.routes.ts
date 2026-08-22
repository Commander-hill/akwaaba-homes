import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { getLandlordCashflows, getTransactionById } from '../controllers/transaction.controller';

const router = Router();

router.get('/landlord', authenticate, authorizeRole(['LANDLORD']), getLandlordCashflows);
router.get('/:id', authenticate, getTransactionById);

export default router;
