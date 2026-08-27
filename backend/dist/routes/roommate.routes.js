"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const roommate_controller_1 = require("../controllers/roommate.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/matches', roommate_controller_1.getRoommateMatches);
router.post('/profile', roommate_controller_1.upsertRoommateProfile);
router.post('/invite', roommate_controller_1.sendRoommateInvitation);
router.get('/invitations', roommate_controller_1.getMyRoommateInvitations);
router.put('/invitations/:id/respond', roommate_controller_1.respondToRoommateInvitation);
exports.default = router;
//# sourceMappingURL=roommate.routes.js.map