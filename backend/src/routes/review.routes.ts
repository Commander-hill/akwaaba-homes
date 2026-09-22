import { Router } from 'express';
import { 
  createReview, 
  getPropertyReviews, 
  flagReview, 
  submitAppeal, 
  getMyReviews,
  getLandlordReviews
} from '../controllers/review.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Public: view approved reviews for a property
router.get('/property/:propertyId', getPropertyReviews);

// Protected: landlord views reviews for their properties
router.get('/landlord', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), getLandlordReviews);

// Protected: tenant creates a review (eligibility enforced in controller)
router.post('/', authenticate, authorizeRole(['TENANT']), createReview);

// Protected: tenant views their own reviews + appeal/flag status
router.get('/mine', authenticate, authorizeRole(['TENANT']), getMyReviews);

// Protected: flag a review for admin moderation
router.put('/:id/flag', authenticate, flagReview);

// Protected: tenant submits an appeal on a moderated/flagged review
router.put('/:id/appeal', authenticate, authorizeRole(['TENANT']), submitAppeal);

export default router;
