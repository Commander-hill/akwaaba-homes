"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staff_controller_1 = require("../controllers/staff.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', staff_controller_1.assignStaff);
router.get('/mine', staff_controller_1.getMyStaffAssignments);
router.get('/me', staff_controller_1.getMyStaffAssignments);
router.get('/assignments', staff_controller_1.getMyStaffAssignments);
router.get('/', staff_controller_1.getPropertyStaff);
router.delete('/:id', staff_controller_1.removeStaff);
exports.default = router;
//# sourceMappingURL=staff.routes.js.map