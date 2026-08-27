"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const property_controller_1 = require("../controllers/property.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const gis_controller_1 = require("../controllers/gis.controller");
const router = (0, express_1.Router)();
// Protected route for Landlord Stats (Must come BEFORE /:id to avoid ID conflict)
router.get('/landlord/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD']), property_controller_1.getLandlordStats);
router.get('/landlord/mine', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD']), property_controller_1.getLandlordProperties);
// Public routes (Tenants & Guests)
router.get('/', property_controller_1.getProperties);
router.get('/:id/landmarks', gis_controller_1.getPropertyCampusLandmarks);
router.get('/:id', property_controller_1.getPropertyById);
// Protected routes (Landlords only)
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), (0, validation_middleware_1.validate)(validation_middleware_1.createPropertyValidation), property_controller_1.createProperty);
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), (0, validation_middleware_1.validate)(validation_middleware_1.updatePropertyValidation), property_controller_1.updateProperty);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), property_controller_1.deleteProperty);
exports.default = router;
//# sourceMappingURL=property.routes.js.map