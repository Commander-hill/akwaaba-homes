"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const push_controller_1 = require("../controllers/push.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/public-key', push_controller_1.getPublicKey);
router.post('/subscribe', auth_middleware_1.authenticate, push_controller_1.subscribe);
router.post('/unsubscribe', auth_middleware_1.authenticate, push_controller_1.unsubscribe);
router.post('/test', auth_middleware_1.authenticate, push_controller_1.sendTestPush);
exports.default = router;
//# sourceMappingURL=push.routes.js.map