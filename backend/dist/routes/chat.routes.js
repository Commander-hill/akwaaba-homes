"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate); // All chat routes require authentication
router.get('/conversations', chat_controller_1.getConversations);
router.post('/conversations', chat_controller_1.createConversation);
router.get('/:conversationId/messages', chat_controller_1.getMessages);
router.post('/:conversationId/messages', chat_controller_1.sendMessage);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map