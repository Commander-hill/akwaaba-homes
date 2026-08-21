"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notice_controller_1 = require("../controllers/notice.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Allow any authenticated user (or even public if desired, but let's stick to authenticated tenants/landlords)
router.use(auth_middleware_1.authenticate);
router.get('/', notice_controller_1.getActiveNotices);
exports.default = router;
//# sourceMappingURL=notice.routes.js.map