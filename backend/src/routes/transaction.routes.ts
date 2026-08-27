import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { 
  getLandlordCashflows, 
  getTransactionById, 
  getTenantTransactions, 
  getLandlordEarningsReport,
  handlePaystackWebhook,
  downloadReceiptPDF,
  getLandlordFinancialLedger,
  exportGRATaxReport
} from '../controllers/transaction.controller';

const router = Router();

// Unauthenticated public route (verified via HMAC SHA512 signature header)
router.post('/webhook', handlePaystackWebhook);

router.get('/tenant', authenticate, getTenantTransactions);
router.get('/landlord', authenticate, authorizeRole(['LANDLORD']), getLandlordCashflows);
router.get('/landlord/report', authenticate, authorizeRole(['LANDLORD']), getLandlordEarningsReport);
router.get('/landlord/financial-ledger', authenticate, authorizeRole(['LANDLORD']), getLandlordFinancialLedger);
router.get('/landlord/tax-report', authenticate, authorizeRole(['LANDLORD']), exportGRATaxReport);
router.get('/:id/pdf', authenticate, downloadReceiptPDF);
router.get('/:id', authenticate, getTransactionById);

export default router;
