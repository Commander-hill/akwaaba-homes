import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getSystemConfig } from '../utils/config.service';

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

export const getLandlordEarningsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;
    const sysConfig = await getSystemConfig();
    const commissionPercent = sysConfig.platformCommissionPercent || 5.0;

    // Fetch all successful transactions for this landlord
    const transactions = await prisma.transaction.findMany({
      where: { landlordId, status: 'SUCCESS' },
      include: {
        booking: {
          include: {
            property: { select: { title: true, id: true } },
            room: { select: { roomType: true, price: true } },
            tenant: { select: { firstName: true, lastName: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalGrossEarnings = 0;
    let thisMonthGrossEarnings = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const cashflows = transactions.map(tx => {
      const gross = tx.amount;
      const commission = (gross * commissionPercent) / 100;
      const net = gross - commission;
      
      totalGrossEarnings += gross;

      const txDate = new Date(tx.createdAt);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        thisMonthGrossEarnings += gross;
      }

      return {
        id: tx.id,
        reference: tx.reference,
        paymentMethod: 'Paystack Direct',
        grossAmount: gross,
        commissionFee: commission,
        netAmount: net,
        createdAt: tx.createdAt,
        propertyTitle: tx.booking?.property?.title || 'Property',
        roomType: tx.booking?.room?.roomType || 'Room',
        tenantName: tx.booking?.tenant ? `${tx.booking.tenant.firstName} ${tx.booking.tenant.lastName}` : 'Tenant'
      };
    });

    const totalCommissionDeducted = (totalGrossEarnings * commissionPercent) / 100;
    const totalNetEarnings = totalGrossEarnings - totalCommissionDeducted;
    const thisMonthNetEarnings = thisMonthGrossEarnings - (thisMonthGrossEarnings * commissionPercent) / 100;

    // Group monthly revenue trends (last 6 months)
    const monthlyTrendsMap: { [key: string]: { month: string, gross: number, net: number } } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      monthlyTrendsMap[key] = { month: key, gross: 0, net: 0 };
    }

    transactions.forEach(tx => {
      const d = new Date(tx.createdAt);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      if (monthlyTrendsMap[key]) {
        const gross = tx.amount;
        const net = gross - (gross * commissionPercent) / 100;
        monthlyTrendsMap[key].gross += gross;
        monthlyTrendsMap[key].net += net;
      }
    });

    res.status(200).json({
      summary: {
        totalGrossEarnings,
        totalCommissionDeducted,
        totalNetEarnings,
        thisMonthGrossEarnings,
        thisMonthNetEarnings,
        platformCommissionPercent: commissionPercent,
        totalBookingsPaid: transactions.length
      },
      monthlyTrends: Object.values(monthlyTrendsMap),
      recentCashflows: cashflows
    });
  } catch (error) {
    console.error('Error fetching landlord earnings report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
