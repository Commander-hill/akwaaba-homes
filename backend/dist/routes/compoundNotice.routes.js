"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const compoundNotice_controller_1 = require("../controllers/compoundNotice.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', compoundNotice_controller_1.createCompoundNotice);
router.get('/property/:propertyId', compoundNotice_controller_1.getPropertyNotices);
router.get('/landlord', compoundNotice_controller_1.getLandlordNotices);
router.delete('/:id', compoundNotice_controller_1.deleteCompoundNotice);
exports.default = router;
//# sourceMappingURL=compoundNotice.routes.js.map