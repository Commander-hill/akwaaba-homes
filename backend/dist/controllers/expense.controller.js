"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinancialAnalytics = exports.deleteExpense = exports.getExpenses = exports.createExpense = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
/**
 * Log a new Property Operating Expense
 */
const createExpense = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId, category, title, amount, date, receiptUrl, notes } = req.body;
        if (!propertyId || !category || !title || amount === undefined) {
            res.status(400).json({ message: 'Property ID, category, title, and amount are required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const expense = await prisma_1.default.propertyExpense.create({
            data: {
                propertyId,
                landlordId,
                category,
                title,
                amount: parseFloat(amount),
                date: date ? new Date(date) : new Date(),
                receiptUrl: receiptUrl || null,
                notes: notes || null
            }
        });
        try {
            (0, socket_1.getIO)().to(landlordId).emit('financials_updated', { propertyId });
        }
        catch (e) { /* non-blocking */ }
        res.status(201).json({ message: 'Expense logged successfully', expense });
    }
    catch (error) {
        console.error('Error logging expense:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createExpense = createExpense;
/**
 * Get Landlord Expenses with Filtering
 */
const getExpenses = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId, category, startDate, endDate } = req.query;
        const where = { landlordId };
        if (propertyId && typeof propertyId === 'string') {
            where.propertyId = propertyId;
        }
        if (category && typeof category === 'string') {
            where.category = category;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(String(startDate));
            if (endDate)
                where.date.lte = new Date(String(endDate));
        }
        const expenses = await prisma_1.default.propertyExpense.findMany({
            where,
            include: {
                property: {
                    select: { id: true, title: true, location: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        res.status(200).json({
            totalCount: expenses.length,
            totalExpenseAmount,
            expenses
        });
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getExpenses = getExpenses;
/**
 * Delete an Expense Record
 */
const deleteExpense = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { id } = req.params;
        const expense = await prisma_1.default.propertyExpense.findUnique({
            where: { id }
        });
        if (!expense) {
            res.status(404).json({ message: 'Expense record not found' });
            return;
        }
        if (expense.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        await prisma_1.default.propertyExpense.delete({
            where: { id }
        });
        try {
            (0, socket_1.getIO)().to(landlordId).emit('financials_updated', { propertyId: expense.propertyId });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({ message: 'Expense deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteExpense = deleteExpense;
/**
 * Comprehensive P&L Financial Summary
 */
const getFinancialAnalytics = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId, year } = req.query;
        const currentYear = year ? parseInt(String(year), 10) : new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
        // 1. Fetch Gross Revenue from Bookings
        const bookingWhere = {
            property: { landlordId },
            status: { in: ['COMPLETED', 'CONFIRMED', 'APPROVED'] },
            createdAt: { gte: startOfYear, lte: endOfYear }
        };
        if (propertyId && typeof propertyId === 'string') {
            bookingWhere.propertyId = propertyId;
        }
        const completedBookings = await prisma_1.default.booking.findMany({
            where: bookingWhere,
            include: {
                room: true,
                transaction: true
            }
        });
        const grossRevenue = completedBookings.reduce((sum, b) => {
            const price = b.transaction?.amount || b.room?.price || 0;
            return sum + price;
        }, 0);
        // Platform commission (10%)
        const platformCommission = grossRevenue * 0.10;
        const netRentalRevenue = grossRevenue - platformCommission;
        // 2. Fetch Expenses
        const expenseWhere = {
            landlordId,
            date: { gte: startOfYear, lte: endOfYear }
        };
        if (propertyId && typeof propertyId === 'string') {
            expenseWhere.propertyId = propertyId;
        }
        const expenses = await prisma_1.default.propertyExpense.findMany({
            where: expenseWhere
        });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = netRentalRevenue - totalExpenses;
        const profitMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;
        // 3. Category Breakdown
        const categoryBreakdown = {};
        expenses.forEach((e) => {
            categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
        });
        // 4. Monthly Trend Data
        const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
            const monthName = new Date(currentYear, i).toLocaleString('default', { month: 'short' });
            return {
                month: monthName,
                revenue: 0,
                expenses: 0,
                net: 0
            };
        });
        completedBookings.forEach((b) => {
            const monthIdx = new Date(b.createdAt).getMonth();
            const amount = b.transaction?.amount || b.room?.price || 0;
            monthlyTrends[monthIdx].revenue += amount * 0.90; // Net rent after platform fee
        });
        expenses.forEach((e) => {
            const monthIdx = new Date(e.date).getMonth();
            monthlyTrends[monthIdx].expenses += e.amount;
        });
        monthlyTrends.forEach((m) => {
            m.net = m.revenue - m.expenses;
        });
        res.status(200).json({
            year: currentYear,
            summary: {
                grossRevenue,
                platformCommission,
                netRentalRevenue,
                totalExpenses,
                netProfit,
                profitMargin
            },
            categoryBreakdown,
            monthlyTrends
        });
    }
    catch (error) {
        console.error('Error fetching financial analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getFinancialAnalytics = getFinancialAnalytics;
//# sourceMappingURL=expense.controller.js.map