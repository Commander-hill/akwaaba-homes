"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public: view approved reviews for a property
router.get('/property/:propertyId', review_controller_1.getPropertyReviews);
// Protected: tenant creates a review (eligibility enforced in controller)
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT']), review_controller_1.createReview);
// Protected: tenant views their own reviews + appeal/flag status
router.get('/mine', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT']), review_controller_1.getMyReviews);
// Protected: flag a review for admin moderation
router.put('/:id/flag', auth_middleware_1.authenticate, review_controller_1.flagReview);
// Protected: tenant submits an appeal on a moderated/flagged review
router.put('/:id/appeal', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT']), review_controller_1.submitAppeal);
exports.default = router;
//# sourceMappingURL=review.routes.js.map