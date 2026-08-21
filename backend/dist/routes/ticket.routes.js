"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticket_controller_1 = require("../controllers/ticket.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All ticket routes require authentication
router.use(auth_middleware_1.authenticate);
// Tenant routes
router.post('/', ticket_controller_1.createTicket);
router.get('/me', ticket_controller_1.getTenantTickets);
// Landlord routes
router.get('/landlord', ticket_controller_1.getLandlordTickets);
router.patch('/:id/status', ticket_controller_1.updateTicketStatus);
exports.default = router;
//# sourceMappingURL=ticket.routes.js.map