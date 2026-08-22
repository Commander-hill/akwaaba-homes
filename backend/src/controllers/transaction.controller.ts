import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getLandlordCashflows = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;
    const role = req.user.role;

    if (role !== 'LANDLORD') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Fetch all successful transactions for this landlord
    const transactions = await prisma.transaction.findMany({
      where: { landlordId, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { firstName: true, lastName: true, email: true } },
        property: { select: { title: true, location: true } },
      }
    });

    // Aggregate by month for the chart (Format: { name: 'Jan', total: 1500 })
    const monthlyData: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize the last 6 months to 0 for a clean chart
    const currentMonthIndex = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonthIndex - i + 12) % 12;
      monthlyData[months[monthIndex]] = 0;
    }

    let totalRevenue = 0;

    transactions.forEach(t => {
      totalRevenue += t.amount;
      const month = months[new Date(t.createdAt).getMonth()];
      if (monthlyData[month] !== undefined) {
        monthlyData[month] += t.amount;
      }
    });

    const chartData = Object.keys(monthlyData).map(key => ({
      name: key,
      total: monthlyData[key]
    }));

    res.status(200).json({
      totalRevenue,
      chartData,
      transactions
    });
  } catch (error) {
    console.error('Error fetching cashflows:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTenantTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user.id;

    const transactions = await prisma.transaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { title: true, location: true, images: true } },
        landlord: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
        booking: { select: { startDate: true, endDate: true, status: true } },
        room: { select: { roomType: true, price: true } }
      }
    });

    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Error fetching tenant transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const id = req.params.id as string;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        tenant: true, // We need all details for the invoice (campus, programmeOfStudy, etc.)
        property: true,
        booking: true
      }
    });

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Ensure the user is either the tenant who made the payment, the landlord of the property, or an admin
    if (role === 'TENANT' && transaction.tenantId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    if (role === 'LANDLORD' && transaction.landlordId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    res.status(200).json({ transaction });
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
