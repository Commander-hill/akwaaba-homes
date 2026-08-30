import { Router } from 'express';
import { createCompoundNotice, getPropertyNotices, getLandlordNotices, deleteCompoundNotice } from '../controllers/compoundNotice.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createCompoundNotice);
router.get('/property/:propertyId', getPropertyNotices);
router.get('/landlord', getLandlordNotices);
router.delete('/:id', deleteCompoundNotice);

export default router;
