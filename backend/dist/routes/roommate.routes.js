"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roommate_controller_1 = require("../controllers/roommate.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.post('/profile', roommate_controller_1.createOrUpdateProfile);
router.get('/profile', roommate_controller_1.getProfile);
router.get('/matches', roommate_controller_1.findMatches);
exports.default = router;
//# sourceMappingURL=roommate.routes.js.map