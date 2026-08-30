import { Router } from 'express';
import { createExpense, getExpenses, deleteExpense, getFinancialAnalytics } from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createExpense);
router.get('/', getExpenses);
router.get('/analytics/summary', getFinancialAnalytics);
router.delete('/:id', deleteExpense);

export default router;
