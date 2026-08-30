import { Router } from 'express';
import { createProperty, getProperties, getPropertyById, updateProperty, deleteProperty, getLandlordStats, getLandlordProperties } from '../controllers/property.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { validate, createPropertyValidation, updatePropertyValidation } from '../middleware/validation.middleware';

import { getPropertyCampusLandmarks } from '../controllers/gis.controller';

const router = Router();

// Protected route for Landlord Stats (Must come BEFORE /:id to avoid ID conflict)
router.get('/landlord/stats', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), getLandlordStats);
router.get('/landlord/mine', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), getLandlordProperties);

// Public routes (Tenants & Guests)
router.get('/', getProperties);
router.get('/:id/landmarks', getPropertyCampusLandmarks);
router.get('/:id', getPropertyById);

// Protected routes (Landlords only)
router.post('/', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), validate(createPropertyValidation), createProperty);
router.put('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), validate(updatePropertyValidation), updateProperty);
router.delete('/:id', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), deleteProperty);

export default router;
