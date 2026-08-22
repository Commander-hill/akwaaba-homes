import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { getLandlordCashflows, getTransactionById, getTenantTransactions } from '../controllers/transaction.controller';

const router = Router();

router.get('/tenant', authenticate, getTenantTransactions);
router.get('/landlord', authenticate, authorizeRole(['LANDLORD']), getLandlordCashflows);
router.get('/:id', authenticate, getTransactionById);

export default router;
