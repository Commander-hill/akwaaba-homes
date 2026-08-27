import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { toggleWishlist, getMyWishlist } from '../controllers/wishlist.controller';

const router = Router();

router.use(authenticate);

router.post('/toggle', toggleWishlist);
router.get('/', getMyWishlist);

export default router;
