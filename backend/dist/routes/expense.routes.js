"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expense_controller_1 = require("../controllers/expense.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', expense_controller_1.createExpense);
router.get('/', expense_controller_1.getExpenses);
router.get('/analytics/summary', expense_controller_1.getFinancialAnalytics);
router.delete('/:id', expense_controller_1.deleteExpense);
exports.default = router;
//# sourceMappingURL=expense.routes.js.map