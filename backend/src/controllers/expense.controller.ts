// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';
import { getSystemConfig } from '../utils/config.service';

/**
 * Log a new Property Operating Expense
 */
export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId, category, title, amount, date, receiptUrl, notes } = req.body;

    if (!propertyId || !category || !title || amount === undefined) {
      res.status(400).json({ message: 'Property ID, category, title, and amount are required' });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const isStaff = await prisma.propertyStaff.findFirst({
      where: { propertyId, userId: landlordId }
    });

    if (property.landlordId !== landlordId && req.user?.role !== 'ADMIN' && !isStaff) {
      res.status(403).json({ message: 'Forbidden: You do not have permission to log expenses for this property' });
      return;
    }

    const expense = await prisma.propertyExpense.create({
      data: {
        propertyId,
        landlordId: property.landlordId,
        category,
        title,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        receiptUrl: receiptUrl || null,
        notes: notes || null
      }
    });

    if (isStaff && property.landlordId !== landlordId) {
      await prisma.notification.create({
        data: {
          userId: property.landlordId,
          type: 'ANNOUNCEMENT',
          title: '🧾 Operating Expense Logged by Staff',
          message: `Staff logged an expense: "${title}" (GHS ${parseFloat(amount).toFixed(2)}) for ${property.title}.`,
          link: '/dashboard/earnings'
        }
      }).catch(() => {});
    }

    try {
      getIO().to(property.landlordId).emit('financials_updated', { propertyId });
    } catch (e) { /* non-blocking */ }

    res.status(201).json({ message: 'Expense logged successfully', expense });
  } catch (error) {
    console.error('Error logging expense:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Landlord Expenses with Filtering
 */
export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId, category, startDate, endDate } = req.query;

    const where: any = { landlordId };

    if (propertyId && typeof propertyId === 'string') {
      where.propertyId = propertyId;
    }
    if (category && typeof category === 'string') {
      where.category = category;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }

    const expenses = await prisma.propertyExpense.findMany({
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
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete an Expense Record
 */
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { id } = req.params;

    const expense = await prisma.propertyExpense.findUnique({
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

    await prisma.propertyExpense.delete({
      where: { id }
    });

    try {
      getIO().to(landlordId).emit('financials_updated', { propertyId: expense.propertyId });
    } catch (e) { /* non-blocking */ }

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Comprehensive P&L Financial Summary
 */
export const getFinancialAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId, year } = req.query;

    const currentYear = year ? parseInt(String(year), 10) : new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // 1. Fetch Gross Revenue from Bookings
    const bookingWhere: any = {
      property: { landlordId },
      status: { in: ['COMPLETED', 'CONFIRMED', 'APPROVED', 'ACTIVE', 'CHECKED_IN'] },
      createdAt: { gte: startOfYear, lte: endOfYear }
    };
    if (propertyId && typeof propertyId === 'string') {
      bookingWhere.propertyId = propertyId;
    }

    const completedBookings = await prisma.booking.findMany({
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

    // Dynamic platform commission from system config (defaults to 5.0%)
    const sysConfig = await getSystemConfig();
    const commissionPercent = sysConfig.platformCommissionPercent || 5.0;
    const commissionRate = commissionPercent / 100;

    const platformCommission = grossRevenue * commissionRate;
    const netRentalRevenue = grossRevenue - platformCommission;

    // 2. Fetch Expenses
    const expenseWhere: any = {
      landlordId,
      date: { gte: startOfYear, lte: endOfYear }
    };
    if (propertyId && typeof propertyId === 'string') {
      expenseWhere.propertyId = propertyId;
    }

    const expenses = await prisma.propertyExpense.findMany({
      where: expenseWhere
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = netRentalRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

    // 3. Category Breakdown
    const categoryBreakdown: { [key: string]: number } = {};
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
      monthlyTrends[monthIdx].revenue += amount * (1 - commissionRate); // Net rent after platform fee
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
        platformCommissionPercent: commissionPercent,
        netRentalRevenue,
        totalExpenses,
        netProfit,
        profitMargin
      },
      categoryBreakdown,
      monthlyTrends
    });
  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
