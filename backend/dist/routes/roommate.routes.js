"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roommate_controller_1 = require("../controllers/roommate.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const config_middleware_1 = require("../middleware/config.middleware");
const router = (0, express_1.Router)();
// All routes require feature flag check, authentication and TENANT role
router.use(config_middleware_1.checkRoommateFeatureEnabled, auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT']));
router.post('/profile', roommate_controller_1.createOrUpdateProfile);
router.get('/profile', roommate_controller_1.getProfile);
router.get('/matches', roommate_controller_1.findMatches);
exports.default = router;
//# sourceMappingURL=roommate.routes.js.map