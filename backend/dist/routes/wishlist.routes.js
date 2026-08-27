"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const wishlist_controller_1 = require("../controllers/wishlist.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/toggle', wishlist_controller_1.toggleWishlist);
router.get('/', wishlist_controller_1.getMyWishlist);
exports.default = router;
//# sourceMappingURL=wishlist.routes.js.map