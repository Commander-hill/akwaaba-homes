import { Router } from 'express';
import { createProperty, getProperties, getPropertyById, updateProperty, deleteProperty, getLandlordStats } from '../controllers/property.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { validate, createPropertyValidation, updatePropertyValidation } from '../middleware/validation.middleware';

const router = Router();

// Protected route for Landlord Stats (Must come BEFORE /:id to avoid ID conflict)
router.get('/landlord/stats', authenticate, authorizeRole(['LANDLORD']), getLandlordStats);

// Public routes (Tenants & Guests)
router.get('/', getProperties);
router.get('/:id', getPropertyById);

// Protected routes (Landlords only)
router.post('/', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), validate(createPropertyValidation), createProperty);
router.put('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), validate(updatePropertyValidation), updateProperty);
router.delete('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), deleteProperty);

export default router;
