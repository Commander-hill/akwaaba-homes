"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const room_controller_1 = require("../controllers/room.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/property/:propertyId', room_controller_1.getRoomsByProperty);
// Landlord/Admin only routes
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), room_controller_1.createRoom);
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), room_controller_1.updateRoom);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), room_controller_1.deleteRoom);
exports.default = router;
//# sourceMappingURL=room.routes.js.map