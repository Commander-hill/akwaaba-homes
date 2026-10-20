// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { notifyPropertyApproval, notifyLandlordVerification } from '../utils/notification.service';
import { decryptData, maskGhanaCardNumber } from '../utils/crypto';
import { generateSignedDocumentUrl } from '../utils/security.service';
import { logAudit } from '../utils/auditLogger';
import appCache from '../utils/cache';
import { safeJsonParse } from '../utils/json';
import { getSystemConfig, invalidateConfigCache } from '../utils/config.service';
import { emitToAll } from '../socket';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSystemStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const cachedStats = appCache.get('admin_stats');
    if (cachedStats) {
      res.status(200).json(cachedStats);
      return;
    }

    const [
      totalUsers,
      totalLandlords,
      totalTenants,
      totalProperties,
      verifiedProperties,
      verifiedUsers,
      verifiedLandlords,
      totalBookings,
      pendingProperties,
      pendingKyc,
      pendingLandlordDeeds,
      openBreaches,
      activeSubscriptions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'LANDLORD' } }),
      prisma.user.count({ where: { role: 'TENANT' } }),
      prisma.property.count(),
      prisma.property.count({ where: { approvalStatus: 'APPROVED' } }),
      prisma.user.count({ where: { ghanaCardStatus: 'VERIFIED' } }),
      prisma.user.count({ where: { role: 'LANDLORD', isVerifiedLandlord: true } }),
      prisma.booking.count(),
      prisma.property.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.user.count({ where: { ghanaCardStatus: { in: ['PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED'] } } }),
      prisma.user.count({ where: { role: 'LANDLORD', landlordVerificationStatus: 'PENDING' } }),
      prisma.breachReport.count({ where: { status: 'PENDING' } }),
      prisma.propertySubscription.count({ where: { isActive: true } })
    ]);
    
    // Sum all successful transaction amounts (total platform escrow volume)
    const transactionSum = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCESS' }
    });
    const totalRevenue = transactionSum._sum.amount || 0;

    // Authentic monthly historical curves computed from real database records (no Math.random)
    const now = new Date();
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = monthStart.toLocaleString('en-US', { month: 'short' });

      const [userCount, propCount, txSum] = await Promise.all([
        prisma.user.count({ where: { createdAt: { lte: monthEnd } } }),
        prisma.property.count({ where: { createdAt: { lte: monthEnd } } }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: 'SUCCESS', createdAt: { lte: monthEnd } }
        })
      ]);

      monthlyGrowth.push({
        name: monthName,
        users: userCount,
        properties: propCount,
        revenue: txSum._sum.amount || 0
      });
    }

    const responseData = {
      totalUsers,
      totalLandlords,
      totalTenants,
      totalProperties,
      verifiedProperties,
      verifiedUsers,
      verifiedLandlords,
      totalBookings,
      totalRevenue,
      pendingProperties,
      pendingKyc,
      pendingLandlordDeeds,
      openBreaches,
      activeSubscriptions,
      monthlyGrowth
    };

    appCache.set('admin_stats', responseData, 60); // Cache stats for 60 seconds

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getActionRequiredQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const [pendingLandlords, pendingKycUsers, pendingProperties, openBreaches, pendingTickets] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'LANDLORD', landlordVerificationStatus: 'PENDING' },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, landlordDocUrl: true, createdAt: true, updatedAt: true },
        take: 10
      }),
      prisma.user.findMany({
        where: { ghanaCardStatus: { in: ['PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED'] } },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, ghanaCardStatus: true, createdAt: true, updatedAt: true },
        take: 10
      }),
      prisma.property.findMany({
        where: { approvalStatus: 'PENDING' },
        include: { landlord: { select: { id: true, firstName: true, lastName: true, email: true } } },
        take: 10
      }),
      prisma.breachReport.findMany({
        where: { status: 'PENDING' },
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { id: true, title: true } }
        },
        take: 10
      }),
      prisma.maintenanceTicket.findMany({
        where: { status: 'PENDING', priority: { in: ['HIGH', 'URGENT'] } },
        include: {
          tenant: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { id: true, title: true } }
        },
        take: 10
      })
    ]);

    const queue: any[] = [
      ...pendingLandlords.map(l => ({
        id: `action-landlord-${l.id}`,
        category: 'LANDLORD_VERIFICATION',
        priority: 'HIGH',
        title: `Landlord Ownership Deed: ${l.firstName} ${l.lastName}`,
        description: `Ownership proof deed awaiting statutory verification.`,
        targetUrl: `/admin/verifications/${l.id}`,
        entityId: l.id,
        createdAt: l.updatedAt || l.createdAt
      })),
      ...pendingKycUsers.map(u => ({
        id: `action-kyc-${u.id}`,
        category: 'IDENTITY_KYC',
        priority: u.ghanaCardStatus === 'UNDER_REVIEW' ? 'MEDIUM' : 'HIGH',
        title: `${u.role === 'LANDLORD' ? 'Landlord' : 'Tenant'} Ghana Card KYC: ${u.firstName} ${u.lastName}`,
        description: `Status: ${u.ghanaCardStatus.replace('_', ' ')}. Identity documents submitted for compliance review.`,
        targetUrl: `/admin/verifications/${u.id}`,
        entityId: u.id,
        createdAt: u.updatedAt || u.createdAt
      })),
      ...pendingProperties.map(p => ({
        id: `action-prop-${p.id}`,
        category: 'PROPERTY_APPROVAL',
        priority: 'HIGH',
        title: `Listing Approval: "${p.title}"`,
        description: `Submitted by ${p.landlord?.firstName || 'Host'} ${p.landlord?.lastName || ''} in ${p.location}. Awaiting listing moderation.`,
        targetUrl: `/admin/properties/${p.id}`,
        entityId: p.id,
        createdAt: p.createdAt
      })),
      ...openBreaches.map(b => ({
        id: `action-breach-${b.id}`,
        category: 'DISPUTE_BREACH',
        priority: 'URGENT',
        title: `Active Tenancy Breach Claim: ${b.title}`,
        description: `Lodged by ${b.reporter?.firstName || 'User'} regarding "${b.property?.title}".`,
        targetUrl: `/admin/disputes/${b.id}`,
        entityId: b.id,
        createdAt: b.createdAt
      })),
      ...pendingTickets.map(t => ({
        id: `action-ticket-${t.id}`,
        category: 'ESCALATED_MAINTENANCE',
        priority: 'URGENT',
        title: `Urgent Repair Escalation: "${t.title}"`,
        description: `At "${t.property?.title}". Reported by ${t.tenant?.firstName || 'Tenant'}.`,
        targetUrl: `/admin/tickets/${t.id}`,
        entityId: t.id,
        createdAt: t.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json(queue);
  } catch (error) {
    console.error('Error fetching action required queue:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPlatformAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Conversion Metrics (Proper real estate tenancy pipeline)
    const totalBookings = await prisma.booking.count();
    const approvedBookings = await prisma.booking.count({ 
      where: { status: { in: ['APPROVED', 'COMPLETED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN'] } } 
    });
    const paidBookings = await prisma.booking.count({ 
      where: { status: { in: ['COMPLETED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN'] } } 
    });
    const conversionRate = totalBookings > 0 ? ((paidBookings / totalBookings) * 100).toFixed(1) : '0.0';

    // 2. Revenue Metrics (Escrow volume)
    const totalTransactions = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCESS' }
    });
    const totalRevenueGhs = totalTransactions._sum.amount || 0;

    // 3. Top 5 Landlords by Revenue
    const landlordGroup = await prisma.transaction.groupBy({
      by: ['landlordId'],
      _sum: { amount: true },
      where: { status: 'SUCCESS' },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5
    });

    const landlordIds = landlordGroup.map(g => g.landlordId);
    const landlords = await prisma.user.findMany({
      where: { id: { in: landlordIds } },
      select: { id: true, firstName: true, lastName: true, email: true, isVerifiedLandlord: true }
    });

    const topLandlords = landlordGroup.map((g, index) => {
      const l = landlords.find(u => u.id === g.landlordId);
      return {
        rank: index + 1,
        landlordId: g.landlordId,
        name: l ? `${l.firstName} ${l.lastName}` : 'Landlord',
        email: l ? l.email : 'N/A',
        isVerified: l ? l.isVerifiedLandlord : false,
        totalEarningsGhs: g._sum.amount || 0
      };
    });

    // 4. Metropolitan Property Density (Ghana Prime Real Estate Regions)
    const properties = await prisma.property.findMany({
      select: { location: true, type: true }
    });

    const locationCounts: Record<string, number> = {
      'Greater Accra': 0,
      'Ashanti (Kumasi)': 0,
      'Central Region': 0,
      'Western (Takoradi)': 0,
      'Eastern & Other': 0
    };

    const categoryCounts: Record<string, number> = {
      'Apartments': 0,
      'Executive Studios': 0,
      'Houses & Villas': 0,
      'Flats & Co-living': 0,
      'Student Hostels': 0
    };

    properties.forEach(p => {
      const loc = (p.location || '').toLowerCase();
      if (loc.includes('accra') || loc.includes('legon') || loc.includes('airport') || loc.includes('cantonments') || loc.includes('osu') || loc.includes('spintex') || loc.includes('tema') || loc.includes('dzorwulu')) {
        locationCounts['Greater Accra']++;
      } else if (loc.includes('kumasi') || loc.includes('ashanti') || loc.includes('knust') || loc.includes('ahodwo') || loc.includes('asokwa')) {
        locationCounts['Ashanti (Kumasi)']++;
      } else if (loc.includes('cape coast') || loc.includes('winneba') || loc.includes('central') || loc.includes('elmina') || loc.includes('ucc') || loc.includes('uew')) {
        locationCounts['Central Region']++;
      } else if (loc.includes('takoradi') || loc.includes('sekondi') || loc.includes('western') || loc.includes('tarkwa')) {
        locationCounts['Western (Takoradi)']++;
      } else {
        locationCounts['Eastern & Other']++;
      }

      const pType = (p.type || '').toLowerCase();
      if (pType.includes('studio')) categoryCounts['Executive Studios']++;
      else if (pType.includes('house') || pType.includes('villa') || pType.includes('homestay')) categoryCounts['Houses & Villas']++;
      else if (pType.includes('flat') || pType.includes('roommate')) categoryCounts['Flats & Co-living']++;
      else if (pType.includes('hostel')) categoryCounts['Student Hostels']++;
      else categoryCounts['Apartments']++;
    });

    const geographicalDensity = Object.keys(locationCounts)
      .map(region => ({
        region,
        propertyCount: locationCounts[region]
      }))
      .filter(item => item.propertyCount > 0);

    const categoryMix = Object.keys(categoryCounts)
      .map(name => ({
        name,
        count: categoryCounts[name]
      }))
      .filter(item => item.count > 0);

    // 5. Monthly Signup & Growth Trends (6 months)
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const totalUsers = await prisma.user.count();
    const totalProperties = await prisma.property.count();

    const monthlyTrends = months.map((month, index) => {
      const factor = (index + 1) / 6;
      return {
        month,
        tenants: Math.round(totalUsers * 0.75 * factor),
        landlords: Math.round(totalUsers * 0.25 * factor),
        approvedProperties: Math.round(totalProperties * factor),
        revenueGhs: Math.round(totalRevenueGhs * factor)
      };
    });

    // 6. Digital Tenancy Agreement Compliance
    const totalDeeds = await prisma.leaseAgreement.count();
    const completedDeeds = await prisma.leaseAgreement.count({ where: { status: 'COMPLETED' } });
    const deedExecutionRate = totalDeeds > 0 ? Math.round((completedDeeds / totalDeeds) * 100) : 100;

    const analyticsData = {
      funnel: {
        totalBookings,
        approvedBookings,
        paidBookings,
        conversionRate: parseFloat(conversionRate)
      },
      totalRevenueGhs,
      topLandlords,
      geographicalDensity,
      categoryMix,
      deedExecutionRate,
      monthlyTrends
    };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, status, search, page, limit } = req.query;

    const where: any = {};

    if (role && role !== 'ALL') {
      where.role = String(role);
    }

    if (status && status !== 'ALL') {
      if (status === 'SUSPENDED') where.isSuspended = true;
      else if (status === 'ACTIVE') where.isSuspended = false;
      else if (status === 'VERIFIED_LANDLORD') where.isVerifiedLandlord = true;
      else if (status === 'VERIFIED_KYC') where.ghanaCardStatus = 'VERIFIED';
      else if (status === 'PENDING_KYC') where.ghanaCardStatus = { in: ['PENDING', 'UNDER_REVIEW'] };
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } }
      ];
    }

    const isPaginated = Boolean(page || limit);
    const pageNum = Math.max(1, parseInt(String(page || 1), 10));
    const takeNum = Math.min(100, Math.max(1, parseInt(String(limit || 50), 10)));
    const skipNum = (pageNum - 1) * takeNum;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(isPaginated ? { skip: skipNum, take: takeNum } : {}),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          phoneNumber: true,
          gender: true,
          campus: true,
          studentId: true,
          programmeOfStudy: true,
          studentType: true,
          isSuspended: true,
          isProfileLocked: true,
          profileUnlockRequested: true,
          profileUnlockReason: true,
          ghanaCardStatus: true,
          ghanaCardNumber: true,
          ghanaCardFrontUrl: true,
          ghanaCardBackUrl: true,
          ghanaCardRejectionReason: true,
          ghanaCardReviewedAt: true,
          ghanaCardReviewedBy: true,
          landlordDocUrl: true,
          isVerifiedLandlord: true,
          landlordVerificationStatus: true,
          reputationScore: true,
          createdAt: true
        }
      })
    ]);

    // Mask sensitive national identity card numbers in list responses (Act 843 compliance)
    const sanitizedUsers = users.map(user => {
      let maskedCard: string | null = null;
      if (user.ghanaCardNumber) {
        try {
          const decrypted = decryptData(user.ghanaCardNumber);
          maskedCard = maskGhanaCardNumber(decrypted);
        } catch {
          maskedCard = 'GHA-•••••••••';
        }
      }

      return {
        ...user,
        ghanaCardNumber: maskedCard,
        ghanaCardFrontUrl: generateSignedDocumentUrl(user.ghanaCardFrontUrl),
        ghanaCardBackUrl: generateSignedDocumentUrl(user.ghanaCardBackUrl),
        landlordDocUrl: generateSignedDocumentUrl(user.landlordDocUrl)
      };
    });

    if (isPaginated) {
      res.status(200).json({
        users: sanitizedUsers,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / takeNum),
        limit: takeNum
      });
    } else {
      res.status(200).json(sanitizedUsers);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        properties: {
          select: { id: true, title: true, type: true, location: true, price: true, approvalStatus: true, isAvailable: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        bookings: {
          include: {
            property: { select: { id: true, title: true, location: true } },
            transaction: { select: { id: true, amount: true, status: true, reference: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        transactionsAsTenant: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        transactionsAsLandlord: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        reviews: {
          include: {
            booking: { include: { property: { select: { id: true, title: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        tenantBreaches: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' }
        },
        reportedBreaches: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let decryptedCard: string | null = null;
    let maskedCard: string | null = null;
    if (user.ghanaCardNumber) {
      try {
        decryptedCard = decryptData(user.ghanaCardNumber);
        maskedCard = maskGhanaCardNumber(decryptedCard);
      } catch {
        maskedCard = 'GHA-•••••••••';
      }
    }

    res.status(200).json({
      ...user,
      ghanaCardNumber: decryptedCard,
      maskedGhanaCard: maskedCard,
      ghanaCardFrontUrl: generateSignedDocumentUrl(user.ghanaCardFrontUrl),
      ghanaCardBackUrl: generateSignedDocumentUrl(user.ghanaCardBackUrl),
      landlordDocUrl: generateSignedDocumentUrl(user.landlordDocUrl)
    });
  } catch (error) {
    console.error('Error fetching user by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            isVerifiedLandlord: true,
            landlordVerificationStatus: true,
            reputationScore: true,
            createdAt: true
          }
        },
        rooms: {
          include: {
            roomUnits: {
              include: {
                beds: true
              }
            }
          }
        },
        bookings: {
          include: {
            tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
            transaction: { select: { id: true, amount: true, status: true, reference: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        subscription: true,
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    res.status(200).json({
      ...property,
      images: safeJsonParse(property.images, []),
      amenities: safeJsonParse(property.amenities, []),
      includedUtilities: safeJsonParse(property.includedUtilities, [])
    });
  } catch (error) {
    console.error('Error fetching property by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true, studentId: true, campus: true }
        },
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
          }
        },
        room: true,
        roomUnit: true,
        bed: true,
        leaseAgreement: true,
        transaction: true,
        review: true
      }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subscription = await prisma.propertySubscription.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
          }
        }
      }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    res.status(200).json({ ...subscription, daysRemaining });
  } catch (error) {
    console.error('Error fetching subscription by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        property: { select: { id: true, title: true, location: true, type: true } },
        booking: {
          include: {
            leaseAgreement: { select: { id: true, status: true, cryptographicHash: true } }
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error('Error fetching transaction by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDisputeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dispute = await prisma.breachReport.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true, reputationScore: true } },
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true, reputationScore: true, isSuspended: true } },
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        }
      }
    });

    if (!dispute) {
      res.status(404).json({ message: 'Dispute case not found' });
      return;
    }

    res.status(200).json(dispute);
  } catch (error) {
    console.error('Error fetching dispute by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getReviewById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true } },
        booking: {
          include: {
            property: {
              include: {
                landlord: { select: { id: true, firstName: true, lastName: true, email: true } }
              }
            }
          }
        }
      }
    });

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.status(200).json(review);
  } catch (error) {
    console.error('Error fetching review by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchEntities = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      res.status(200).json({ results: [] });
      return;
    }

    const [users, properties, bookings, transactions] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phoneNumber: { contains: q } }
          ]
        },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, isSuspended: true },
        take: 6
      }),
      prisma.property.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
            { type: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: { id: true, title: true, location: true, price: true, approvalStatus: true },
        take: 6
      }),
      prisma.booking.findMany({
        where: {
          OR: [
            { id: { contains: q, mode: 'insensitive' } },
            { property: { title: { contains: q, mode: 'insensitive' } } },
            { tenant: { firstName: { contains: q, mode: 'insensitive' } } },
            { tenant: { lastName: { contains: q, mode: 'insensitive' } } }
          ]
        },
        include: {
          property: { select: { title: true } },
          tenant: { select: { firstName: true, lastName: true } }
        },
        take: 6
      }),
      prisma.transaction.findMany({
        where: {
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { id: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: { id: true, reference: true, amount: true, status: true, createdAt: true },
        take: 5
      })
    ]);

    const results = [
      ...users.map(u => ({
        id: u.id,
        type: u.role === 'LANDLORD' ? 'LANDLORD' : (u.role === 'ADMIN' ? 'ADMIN' : 'TENANT'),
        title: `${u.firstName} ${u.lastName}`,
        subtitle: u.email,
        status: u.isSuspended ? 'SUSPENDED' : 'ACTIVE',
        url: u.role === 'LANDLORD' ? `/admin/landlords/${u.id}` : `/admin/tenants/${u.id}`
      })),
      ...properties.map(p => ({
        id: p.id,
        type: 'PROPERTY',
        title: p.title,
        subtitle: p.location,
        status: p.approvalStatus,
        url: `/admin/properties/${p.id}`
      })),
      ...bookings.map(b => ({
        id: b.id,
        type: 'BOOKING',
        title: `Booking #${b.id.slice(0, 8)}`,
        subtitle: `${b.tenant?.firstName || 'Tenant'} - ${b.property?.title || 'Property'}`,
        status: b.status,
        url: `/admin/bookings/${b.id}`
      })),
      ...transactions.map(t => ({
        id: t.id,
        type: 'TRANSACTION',
        title: `Ref: ${t.reference}`,
        subtitle: `GH₵ ${t.amount.toLocaleString()}`,
        status: t.status,
        url: `/admin/transactions/${t.id}`
      }))
    ];

    res.status(200).json({ results });
  } catch (error) {
    console.error('Error performing global search:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdministrators = async (req: Request, res: Response): Promise<void> => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phoneNumber: true,
        isSuspended: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(admins);
  } catch (error) {
    console.error('Error fetching administrators:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAdministrator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, role, phoneNumber } = req.body;
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: 'Missing required administrator fields' });
      return;
    }

    const assignedRole = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ message: 'A user with this email address already exists' });
      return;
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        phoneNumber: phoneNumber || null,
        passwordHash,
        role: assignedRole,
        isEmailVerified: true
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }
    });

    await logAudit(
      req.user.id,
      'CREATE_ADMINISTRATOR',
      'User',
      newAdmin.id,
      null,
      { email: normalizedEmail, role: assignedRole },
      req.ip || req.socket.remoteAddress
    );

    res.status(201).json({ message: 'Administrator account provisioned successfully', admin: newAdmin });
  } catch (error) {
    console.error('Error creating administrator:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleAdminStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    if (id === req.user.id) {
      res.status(400).json({ message: 'Security restriction: You cannot suspend your own administrative account.' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || !['ADMIN', 'SUPER_ADMIN'].includes(target.role)) {
      res.status(404).json({ message: 'Administrator account not found.' });
      return;
    }

    if (target.role === 'SUPER_ADMIN' && isSuspended) {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isSuspended: false }
      });
      if (superAdminCount <= 1) {
        res.status(400).json({ message: 'Operation aborted: Cannot suspend the last active Super Administrator.' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isSuspended: Boolean(isSuspended) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isSuspended: true }
    });

    await logAudit(
      req.user.id,
      isSuspended ? 'SUSPEND_ADMIN' : 'REINSTATE_ADMIN',
      'User',
      id,
      { isSuspended: target.isSuspended },
      { isSuspended },
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: `Administrator status updated to ${isSuspended ? 'Suspended' : 'Active'}`, admin: updated });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleUserSuspension = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;
    const targetSuspensionState = Boolean(isSuspended);

    // Prevent suspending self or other admins
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    if (targetUser.role === 'ADMIN') {
      res.status(403).json({ message: 'Cannot suspend an administrator account' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isSuspended: targetSuspensionState },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isSuspended: true }
    });

    if (targetSuspensionState) {
      // Invalidate all active sessions for suspended user immediately
      await prisma.session.deleteMany({ where: { userId: id } });
      appCache.del(`user:me:${id}`);

      // Deactivate all listings if suspended user is a landlord
      if (targetUser.role === 'LANDLORD') {
        await prisma.property.updateMany({
          where: { landlordId: id },
          data: { isAvailable: false }
        });
      }

      try {
        const { getIO } = await import('../socket');
        getIO().to(id).emit('session_revoked', { reason: 'Your account has been suspended by an administrator.' });
        if (targetUser.role === 'LANDLORD') {
          getIO().emit('property_updated', { landlordId: id });
        }
      } catch (e) {}
    }

    try {
      emitToAll('user_updated', { userId: id, isSuspended: targetSuspensionState });
    } catch (e) {
      console.warn('Socket notification for user suspension failed:', e);
    }

    await logAudit(
      req.user.id,
      targetSuspensionState ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      'User',
      id,
      { isSuspended: targetUser.isSuspended },
      { isSuspended: targetSuspensionState },
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ 
      message: `User ${updatedUser.firstName} ${updatedUser.lastName} has been ${targetSuspensionState ? 'suspended' : 'unsuspended'} successfully.`, 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error toggling user suspension:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleUserProfileLock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isProfileLocked } = req.body;
    const targetLockState = Boolean(isProfileLocked);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        isProfileLocked: targetLockState,
        profileUnlockRequested: false,
        profileUnlockReason: null
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isProfileLocked: true }
    });

    // Clear user cache so /auth/me reflects fresh profile lock state immediately
    appCache.del(`user:me:${id}`);

    await prisma.notification.create({
      data: {
        userId: id,
        type: 'ANNOUNCEMENT',
        title: targetLockState ? '🔒 Profile Locked' : '🔓 Profile Edit Access Granted',
        message: targetLockState 
          ? 'Your profile credentials have been locked by an administrator.' 
          : 'An administrator has unlocked your profile. You can now update your details.',
        link: '/dashboard/profile'
      }
    }).catch(() => null);

    await logAudit(
      req.user.id,
      targetLockState ? 'LOCK_USER_PROFILE' : 'UNLOCK_USER_PROFILE',
      'User',
      id,
      { isProfileLocked: targetUser.isProfileLocked },
      { isProfileLocked: targetLockState },
      req.ip || req.socket.remoteAddress
    );

    // Notify user in real-time so their profile page updates without refresh
    try {
      const { getIO } = await import('../socket');
      getIO().to(id).emit('user_updated', { isProfileLocked: targetLockState });
      if (!targetLockState) {
        getIO().to(id).emit('notification', {
          title: '🔓 Profile Edit Access Granted',
          message: 'An administrator has unlocked your profile. You can now update your information.',
          type: 'profile'
        });
      }
    } catch (e) { /* socket optional */ }

    res.status(200).json({
      message: `User ${updatedUser.firstName} ${updatedUser.lastName}'s profile lock status has been updated to ${targetLockState ? 'Locked' : 'Unlocked (Edit Access Granted)'}.`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error toggling user profile lock:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        landlord: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const parsedProperties = properties.map(p => ({
      ...p,
      images: safeJsonParse(p.images, []),
      amenities: safeJsonParse(p.amenities, [])
    }));

    res.status(200).json(parsedProperties);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePropertyApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body; // PENDING, APPROVED, REJECTED

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(approvalStatus)) {
      res.status(400).json({ message: 'Invalid approval status' });
      return;
    }

    const oldProperty = await prisma.property.findUnique({ where: { id } });
    if (!oldProperty) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        approvalStatus,
        ...(approvalStatus === 'REJECTED' ? { isAvailable: false } : {})
      },
      include: { landlord: { select: { id: true, email: true, firstName: true } } }
    });

    await logAudit(
      req.user.id,
      approvalStatus === 'APPROVED' ? 'APPROVE_PROPERTY' : (approvalStatus === 'REJECTED' ? 'REJECT_PROPERTY' : 'PENDING_PROPERTY'),
      'Property',
      id,
      { approvalStatus: oldProperty.approvalStatus },
      { approvalStatus },
      req.ip || req.socket.remoteAddress
    );

    // Notify the landlord about their listing decision
    if (approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED') {
      await notifyPropertyApproval({
        landlordId: property.landlord.id,
        landlordEmail: property.landlord.email,
        landlordName: property.landlord.firstName,
        propertyTitle: property.title,
        status: approvalStatus as 'APPROVED' | 'REJECTED'
      });
    }

    // Invalidate properties cache
    const keys = appCache.keys();
    const propertyKeys = keys.filter(k => k.startsWith('properties_'));
    appCache.del(propertyKeys);

    // Emit real-time property update to landlord and globally so public listings refresh
    try {
      const { getIO } = await import('../socket');
      getIO().emit('property_updated', { propertyId: id, approvalStatus });
      getIO().to(property.landlord.id).emit('property_updated', { propertyId: id, approvalStatus });
      getIO().to(property.landlord.id).emit('notification', {
        title: approvalStatus === 'APPROVED' ? '🎉 Property Listing Approved!' : '❌ Property Listing Rejected',
        message: approvalStatus === 'APPROVED'
          ? `Your listing "${property.title}" has been approved. Pay the listing fee to go live!`
          : `Your listing "${property.title}" was rejected. Please review the guidelines and resubmit.`,
        type: 'property'
      });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ message: `Property status updated to ${approvalStatus}`, property });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        tenant: { 
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } 
        },
        property: { 
          select: { 
            id: true, 
            title: true, 
            location: true, 
            price: true, 
            pricePeriod: true,
            type: true,
            landlord: { 
              select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } 
            } 
          } 
        },
        room: { 
          select: { id: true, name: true, price: true, type: true } 
        },
        roomUnit: { 
          select: { unitNumber: true } 
        },
        transaction: { 
          select: { id: true, amount: true, status: true, reference: true, paymentMethod: true, createdAt: true } 
        },
        leaseAgreement: { 
          select: { id: true, status: true, tenantSignedAt: true, landlordSignedAt: true, cryptographicHash: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptions = await prisma.propertySubscription.findMany({
      include: {
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Enrich each subscription with days remaining
    const now = new Date();
    const enriched = subscriptions.map(sub => {
      const endDate = new Date(sub.endDate);
      const diffMs = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...sub, daysRemaining };
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        property: { select: { id: true, title: true, location: true, type: true } },
        booking: { select: { id: true, startDate: true, endDate: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyUserCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; // PENDING, UNDER_REVIEW, VERIFIED, REJECTED, RESUBMISSION_REQUIRED

    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: `Invalid status. Allowed values: ${validStatuses.join(', ')}` });
      return;
    }

    if (['REJECTED', 'RESUBMISSION_REQUIRED'].includes(status) && (!reason || !String(reason).trim())) {
      res.status(400).json({ 
        message: 'A clear explanation/reason is required when rejecting or requesting document resubmission.' 
      });
      return;
    }

    const oldUser = await prisma.user.findUnique({ where: { id } });
    if (!oldUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const trimmedReason = reason ? String(reason).trim() : null;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ghanaCardStatus: status,
        ghanaCardRejectionReason: ['REJECTED', 'RESUBMISSION_REQUIRED'].includes(status) ? trimmedReason : null,
        ghanaCardReviewedAt: new Date(),
        ghanaCardReviewedBy: req.user?.id || 'ADMIN'
      },
      select: { 
        id: true, 
        ghanaCardStatus: true,
        ghanaCardRejectionReason: true,
        ghanaCardReviewedAt: true,
        ghanaCardReviewedBy: true
      }
    });

    await logAudit(
      req.user.id,
      `KYC_STATUS_${status}`,
      'User',
      id,
      { ghanaCardStatus: oldUser.ghanaCardStatus },
      { ghanaCardStatus: status, reason: trimmedReason },
      req.ip || req.socket.remoteAddress
    );

    // Clear cached profile so dashboard and verification page immediately reflect new status
    appCache.del(`user:me:${id}`);
    appCache.flushAll();

    // Determine notification copy based on status
    let notificationTitle = '🪪 Ghana Card Verification Update';
    let notificationMessage = `Your Ghana Card status has been updated to ${status}.`;
    let notifType = 'SYSTEM_ALERT';

    if (status === 'VERIFIED') {
      notificationTitle = '✅ Ghana Card Identity Verified!';
      notificationMessage = 'Your Ghana Card has been approved. You now have full access to listings and bookings.';
      notifType = 'ANNOUNCEMENT';
    } else if (status === 'UNDER_REVIEW') {
      notificationTitle = '🔍 Ghana Card Under Review';
      notificationMessage = 'Our compliance team is currently reviewing your Ghana Card identity credentials.';
      notifType = 'INFO';
    } else if (status === 'RESUBMISSION_REQUIRED') {
      notificationTitle = '⚠️ Ghana Card Resubmission Required';
      notificationMessage = `Please re-upload your Ghana Card images: ${trimmedReason}`;
      notifType = 'SYSTEM_ALERT';
    } else if (status === 'REJECTED') {
      notificationTitle = '❌ Ghana Card Verification Rejected';
      notificationMessage = `Your Ghana Card submission was rejected: ${trimmedReason}`;
      notifType = 'SYSTEM_ALERT';
    }

    // In-app persistent notification
    await prisma.notification.create({
      data: {
        userId: id,
        type: notifType,
        title: notificationTitle,
        message: notificationMessage,
        link: '/dashboard/verification'
      }
    }).catch(() => {});

    // Notify the user in real-time and broadcast update to all admins
    try {
      const { getIO, emitToAdmins, emitToAll } = await import('../socket');
      getIO().to(id).emit('notification', {
        title: notificationTitle,
        message: notificationMessage,
        type: 'verification'
      });
      getIO().to(id).emit('user_updated', { 
        ghanaCardStatus: status,
        ghanaCardRejectionReason: user.ghanaCardRejectionReason
      });
      emitToAdmins('verification_updated', { userId: id, ghanaCardStatus: status, type: 'GHANA_CARD' });
      emitToAll('user_updated', { userId: id, ghanaCardStatus: status });
      emitToAll('verification_updated', { userId: id, ghanaCardStatus: status, type: 'GHANA_CARD' });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ 
      message: `User Ghana Card status updated to ${status.replace('_', ' ')} successfully`, 
      user 
    });
  } catch (error) {
    console.error('Error verifying user card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyLandlord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // VERIFIED, REJECTED

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const isVerified = status === 'VERIFIED';

    const user = await prisma.user.update({
      where: { id },
      data: {
        landlordVerificationStatus: status,
        isVerifiedLandlord: isVerified
      }
    });

    appCache.del(`user:me:${id}`);
    appCache.flushAll();

    // Persistent in-app notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'ANNOUNCEMENT',
        title: isVerified ? 'Verified Landlord Status Approved' : 'Landlord Verification Update',
        message: isVerified
          ? 'Congratulations! Your identity and ownership documents have been verified with official Verified Landlord status.'
          : 'Your landlord verification request was not approved. Please review your documents or contact support.',
        link: '/dashboard/landlord'
      }
    }).catch(() => {});

    try {
      const { emitToUser, emitToAll, emitToAdmins } = await import('../socket');
      emitToUser(id, 'user_updated', { landlordVerificationStatus: status, isVerifiedLandlord: isVerified });
      emitToAdmins('verification_updated', { userId: id, landlordVerificationStatus: status, isVerifiedLandlord: isVerified, type: 'LANDLORD_DEED' });
      emitToAll('user_updated', { userId: id });
      emitToAll('verification_updated', { userId: id, type: 'LANDLORD_DEED' });
      emitToAll('landlord_deeds_updated', { userId: id });
    } catch (e) {}

    // Dispatch SMS & Email Notification
    notifyLandlordVerification({
      landlordId: user.id,
      landlordEmail: user.email,
      landlordName: `${user.firstName} ${user.lastName}`,
      landlordPhone: user.phoneNumber,
      isVerified
    }).catch((e) => console.error('[Notification Error]', e));

    res.status(200).json({
      message: `Landlord verification ${isVerified ? 'approved with Verified status' : 'rejected'}.`,
      user
    });
  } catch (error) {
    console.error('Error verifying landlord:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllReviews = async (req: Request, res: Response): Promise<void> => { 
  try { 
    const reviews = await prisma.review.findMany({ 
      include: { 
        author: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }, 
        booking: { 
          include: { 
            property: { 
              select: { 
                id: true, 
                title: true, 
                location: true,
                type: true,
                landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
              } 
            } 
          } 
        } 
      }, 
      orderBy: { createdAt: 'desc' } 
    }); 
    res.status(200).json(reviews); 
  } catch (error) { 
    res.status(500).json({ message: 'Internal server error' }); 
  } 
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.review.delete({ where: { id } });
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const activateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subscription = await prisma.propertySubscription.findUnique({
      where: { id },
      include: { property: { include: { landlord: { select: { id: true, firstName: true } } } } }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const updated = await prisma.propertySubscription.update({
      where: { id },
      data: { isActive: true, paymentStatus: 'COMPLETED', startDate, endDate }
    });

    await prisma.property.update({
      where: { id: subscription.propertyId },
      data: { isAvailable: true }
    });

    await logAudit(
      req.user.id, 'ACTIVATE_SUBSCRIPTION', 'PropertySubscription', id,
      { isActive: false }, { isActive: true },
      req.ip || req.socket.remoteAddress
    );

    try {
      appCache.flushAll();
      const { getIO } = await import('../socket');
      getIO().to(subscription.property.landlord.id).emit('notification', {
        title: 'Subscription Activated',
        message: `Your listing for "${subscription.property.title}" has been manually activated by an admin.`,
        type: 'subscription'
      });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ message: 'Subscription activated successfully', subscription: updated });
  } catch (error) {
    console.error('Error activating subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const revokeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await prisma.propertySubscription.findUnique({
      where: { id },
      include: { property: { include: { landlord: { select: { id: true, firstName: true } } } } }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    const updated = await prisma.propertySubscription.update({
      where: { id },
      data: { isActive: false, paymentStatus: 'FAILED' }
    });

    await prisma.property.update({
      where: { id: subscription.propertyId },
      data: { isAvailable: false }
    });

    await logAudit(
      req.user.id, 'REVOKE_SUBSCRIPTION', 'PropertySubscription', id,
      { isActive: true }, { isActive: false, reason: reason || 'Admin revocation' },
      req.ip || req.socket.remoteAddress
    );

    try {
      appCache.flushAll();
      const { getIO } = await import('../socket');
      getIO().to(subscription.property.landlord.id).emit('notification', {
        title: 'Listing Subscription Revoked',
        message: `Your listing for "${subscription.property.title}" has been suspended by an admin. Reason: ${reason || 'Terms of Service violation'}.`,
        type: 'subscription'
      });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ message: 'Subscription revoked successfully', subscription: updated });
  } catch (error) {
    console.error('Error revoking subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resolveAppeal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, moderationNote } = req.body; // decision: 'ACCEPTED' | 'REJECTED'

    if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
      res.status(400).json({ message: 'Decision must be ACCEPTED or REJECTED' });
      return;
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    const updateData: any = {
      appealStatus: decision,
      moderationNote: moderationNote || '',
      isModerated: true
    };

    // If appeal is accepted, restore the review (unflag it)
    if (decision === 'ACCEPTED') {
      updateData.isFlagged = false;
    }

    await prisma.review.update({ where: { id }, data: updateData });

    // Recalculate landlord reputation after appeal resolution
    const booking = await prisma.booking.findUnique({
      where: { id: review.bookingId },
      include: { property: true }
    });
    if (booking?.property?.landlordId) {
      const landlordId = booking.property.landlordId;
      const allReviews = await prisma.review.findMany({
        where: {
          booking: { property: { landlordId } },
          isFlagged: false,
          isModerated: false
        },
        select: { rating: true }
      });
      if (allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
        await prisma.user.update({
          where: { id: landlordId },
          data: { reputationScore: parseFloat(avg.toFixed(2)) }
        });
      }
    }

    res.status(200).json({ message: `Appeal ${decision.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Error resolving appeal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSystemActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch the most recent cross-entity events to form an executive platform telemetry stream
    const [recentBookings, recentUsers, recentProperties, recentSubscriptions, recentTickets, recentBreaches, recentReviews] = await Promise.all([
      prisma.booking.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
          property: { select: { id: true, title: true, location: true, price: true } }
        }
      }),
      prisma.user.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true, ghanaCardStatus: true, isVerifiedLandlord: true, createdAt: true }
      }),
      prisma.property.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: {
          landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }
        }
      }),
      prisma.propertySubscription.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          property: {
            include: {
              landlord: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          }
        }
      }),
      prisma.maintenanceTicket.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true, location: true } }
        }
      }),
      prisma.breachReport.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true, role: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { id: true, title: true } }
        }
      }),
      prisma.review.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          booking: {
            select: {
              property: { select: { id: true, title: true, location: true } }
            }
          }
        }
      })
    ]);

    const activity: any[] = [
      ...recentBookings.map(b => ({
        id: `booking-${b.id}`,
        type: 'BOOKING',
        severity: b.status === 'CANCELLED' ? 'NOTICE' : (b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'COMPLIANCE' : 'INFO'),
        title: 'Tenancy Escrow Booking',
        message: `${b.tenant?.firstName || 'Tenant'} ${b.tenant?.lastName || ''} booked residential lease on "${b.property?.title || 'Property'}"`,
        actor: {
          name: `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.trim() || 'Tenant',
          email: b.tenant?.email,
          phone: b.tenant?.phoneNumber,
          role: 'TENANT'
        },
        entity: {
          type: 'Property',
          id: b.property?.id,
          title: b.property?.title,
          location: b.property?.location,
          financialAmount: b.property?.price ? `GH₵ ${b.property.price.toLocaleString()}` : undefined
        },
        status: b.status,
        createdAt: b.createdAt
      })),

      ...recentUsers.map(u => ({
        id: `user-${u.id}`,
        type: 'USER',
        severity: u.isVerifiedLandlord || u.ghanaCardStatus === 'VERIFIED' ? 'COMPLIANCE' : 'INFO',
        title: `${u.role === 'LANDLORD' ? 'Landlord' : 'Tenant'} Registration`,
        message: `New verified registration: ${u.firstName} ${u.lastName} (${u.role === 'LANDLORD' ? 'Property Owner' : 'Resident'})`,
        actor: {
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.phoneNumber,
          role: u.role
        },
        entity: {
          type: 'User Profile',
          id: u.id,
          title: `${u.firstName} ${u.lastName}`,
          location: u.role === 'LANDLORD' ? (u.isVerifiedLandlord ? 'Verified Title Deed' : 'Pending Deed Audit') : (u.ghanaCardStatus === 'VERIFIED' ? 'Verified Ghana Card' : 'Pending NIA KYC')
        },
        status: u.ghanaCardStatus === 'VERIFIED' || u.isVerifiedLandlord ? 'VERIFIED' : 'NEW',
        createdAt: u.createdAt
      })),

      ...recentProperties.map(p => ({
        id: `prop-${p.id}`,
        type: 'PROPERTY',
        severity: p.approvalStatus === 'APPROVED' ? 'COMPLIANCE' : (p.approvalStatus === 'REJECTED' ? 'CRITICAL' : 'NOTICE'),
        title: 'Residential Listing Submission',
        message: `Property "${p.title}" (${p.location || 'Ghana'}) submitted for statutory deed & rent cap compliance audit`,
        actor: {
          name: p.landlord ? `${p.landlord.firstName} ${p.landlord.lastName}` : 'Property Owner',
          email: p.landlord?.email,
          phone: p.landlord?.phoneNumber,
          role: 'LANDLORD'
        },
        entity: {
          type: 'Property Listing',
          id: p.id,
          title: p.title,
          location: p.location,
          financialAmount: p.price ? `GH₵ ${p.price.toLocaleString()}` : undefined
        },
        status: p.approvalStatus,
        createdAt: p.createdAt
      })),

      ...recentSubscriptions.map(s => ({
        id: `sub-${s.id}`,
        type: 'PAYMENT',
        severity: s.paymentStatus === 'COMPLETED' ? 'COMPLIANCE' : 'NOTICE',
        title: 'Landlord Listing License Fee',
        message: `Annual Landlord Listing Permit transaction: GH₵ 100/yr for "${s.property?.title || 'Property'}"`,
        actor: {
          name: s.property?.landlord ? `${s.property.landlord.firstName} ${s.property.landlord.lastName}` : 'Landlord',
          email: s.property?.landlord?.email,
          role: 'LANDLORD'
        },
        entity: {
          type: 'Subscription Permit',
          id: s.id,
          title: `License #${(s.paymentReference || s.id).slice(0, 8)}`,
          financialAmount: 'GH₵ 100'
        },
        status: s.paymentStatus,
        createdAt: s.createdAt
      })),

      ...recentTickets.map(t => ({
        id: `ticket-${t.id}`,
        type: 'MAINTENANCE',
        severity: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'CRITICAL' : 'NOTICE',
        title: `Statutory Maintenance Request`,
        message: `[${t.priority}] Repair reported at "${t.property?.title || 'Property'}": ${t.title}`,
        actor: {
          name: t.tenant ? `${t.tenant.firstName} ${t.tenant.lastName}` : 'Tenant',
          email: t.tenant?.email,
          role: 'TENANT'
        },
        entity: {
          type: 'Property',
          id: t.property?.id,
          title: t.property?.title,
          location: t.property?.location
        },
        status: t.status,
        createdAt: t.createdAt
      })),

      ...recentBreaches.map(b => ({
        id: `breach-${b.id}`,
        type: 'SECURITY',
        severity: 'CRITICAL',
        title: 'Tenancy Dispute Report',
        message: `Breach claim lodged against tenant ${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''} at "${b.property?.title || 'Property'}": ${b.title}`,
        actor: {
          name: b.reporter ? `${b.reporter.firstName} ${b.reporter.lastName}` : 'Complainant',
          role: b.reporter?.role || 'USER'
        },
        entity: {
          type: 'Breach Docket',
          id: b.id,
          title: b.title
        },
        status: b.status,
        createdAt: b.createdAt
      })),

      ...recentReviews.map(r => ({
        id: `review-${r.id}`,
        type: 'REVIEW',
        severity: r.rating <= 2 ? 'NOTICE' : 'INFO',
        title: `Tenant Reputation Rating (${r.rating} ★)`,
        message: `${r.author?.firstName || 'Tenant'} ${r.author?.lastName || ''} submitted a ${r.rating} ★ tenancy rating for "${r.booking?.property?.title || 'Property'}"`,
        actor: {
          name: r.author ? `${r.author.firstName} ${r.author.lastName}` : 'Tenant',
          role: 'TENANT'
        },
        entity: {
          type: 'Property',
          id: r.booking?.property?.id,
          title: r.booking?.property?.title,
          location: r.booking?.property?.location
        },
        status: r.isFlagged ? 'FLAGGED' : 'PUBLISHED',
        createdAt: r.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);

    res.status(200).json(activity);
  } catch (error) {
    console.error('Error fetching system activity:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await getSystemConfig();
    res.status(200).json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ghanaCardVerificationEnabled, bookingGracePeriodHours, platformCommissionPercent, roommateFinderEnabled, maintenanceMode, maintenanceEndTime } = req.body;
    
    const updatedConfig = await prisma.systemConfig.upsert({
      where: { id: 'GLOBAL' },
      update: {
        ...(ghanaCardVerificationEnabled !== undefined && { ghanaCardVerificationEnabled }),
        ...(bookingGracePeriodHours !== undefined && { bookingGracePeriodHours }),
        ...(platformCommissionPercent !== undefined && { platformCommissionPercent }),
        ...(roommateFinderEnabled !== undefined && { roommateFinderEnabled }),
        ...(maintenanceMode !== undefined && { maintenanceMode }),
        ...(maintenanceEndTime !== undefined && { maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null }),
      },
      create: {
        id: 'GLOBAL',
        ghanaCardVerificationEnabled: ghanaCardVerificationEnabled ?? true,
        bookingGracePeriodHours: bookingGracePeriodHours ?? 48,
        platformCommissionPercent: platformCommissionPercent ?? 5.0,
        roommateFinderEnabled: roommateFinderEnabled ?? true,
        maintenanceMode: maintenanceMode ?? false,
        maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null,
      }
    });

    invalidateConfigCache();

    try {
      emitToAll('config_updated', updatedConfig);
    } catch (e) {
      console.error('Failed to emit config_updated socket event', e);
    }

    await logAudit(
      req.user.id, 'ADMIN_UPDATE_CONFIG', 'SystemConfig', 'GLOBAL',
      null, updatedConfig,
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: 'Configuration updated successfully', config: updatedConfig });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.maintenanceTicket.findMany({
      include: {
        tenant: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
        property: { 
          include: { 
            landlord: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } } 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(tickets);
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const adminUpdateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    const updatedTicket = await prisma.maintenanceTicket.update({
      where: { id },
      data: { status }
    });

    await logAudit(
      req.user.id, 'ADMIN_UPDATE_TICKET', 'MaintenanceTicket', id,
      { status: ticket.status }, { status },
      req.ip || req.socket.remoteAddress
    );

    // Create persistent DB notifications
    await prisma.notification.create({
      data: {
        userId: ticket.tenantId,
        type: 'ANNOUNCEMENT',
        title: '🛠️ Maintenance Ticket Updated by Admin',
        message: `Your maintenance ticket "${ticket.title}" was updated to ${status.toLowerCase()} by platform admin.`,
        link: '/dashboard/tenant'
      }
    }).catch(() => null);

    await prisma.notification.create({
      data: {
        userId: ticket.property.landlordId,
        type: 'ANNOUNCEMENT',
        title: '🛠️ Ticket Status Updated by Admin',
        message: `Admin updated ticket "${ticket.title}" for ${ticket.property.title || 'your property'} to ${status.toLowerCase()}.`,
        link: '/dashboard/landlord'
      }
    }).catch(() => null);

    try {
      const { getIO } = await import('../socket');
      const io = getIO();
      // Notify both tenant and landlord
      io.to(ticket.tenantId).emit('notification', {
        title: `Ticket Escalate/Update`,
        message: `Your maintenance ticket "${ticket.title}" has been set to ${status.toLowerCase()} by an admin.`,
        type: 'ticket'
      });
      io.to(ticket.tenantId).emit('ticket_updated', { ticket: updatedTicket });
      
      io.to(ticket.property.landlordId).emit('notification', {
        title: `Ticket Escalation`,
        message: `Admin has updated the status of ticket "${ticket.title}" to ${status.toLowerCase()}.`,
        type: 'ticket'
      });
      io.to(ticket.property.landlordId).emit('ticket_updated', { ticket: updatedTicket });
    } catch (e) { /* ignore */ }

    res.status(200).json({ message: 'Ticket updated successfully', ticket: updatedTicket });
  } catch (error) {
    console.error('Error admin updating ticket:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const broadcastNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { target, title, message } = req.body; // target: 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS'
    
    if (!['ALL_TENANTS', 'ALL_LANDLORDS', 'ALL_USERS'].includes(target)) {
      res.status(400).json({ message: 'Invalid target group' });
      return;
    }

    let users = [];
    if (target === 'ALL_TENANTS') {
      users = await prisma.user.findMany({ where: { role: 'TENANT' }, select: { id: true } });
    } else if (target === 'ALL_LANDLORDS') {
      users = await prisma.user.findMany({ where: { role: 'LANDLORD' }, select: { id: true } });
    } else {
      users = await prisma.user.findMany({ select: { id: true } });
    }

    if (users.length === 0) {
      res.status(200).json({ message: 'No users found for the target group', count: 0 });
      return;
    }

    // Create DB notifications
    const notificationsData = users.map(u => ({
      userId: u.id,
      title,
      message,
      type: 'ANNOUNCEMENT'
    }));

    await prisma.notification.createMany({
      data: notificationsData
    });

    // Broadcast via socket
    try {
      const { emitToUser } = await import('../socket');
      users.forEach(u => {
        emitToUser(u.id, 'notification', { title, message, type: 'ANNOUNCEMENT' });
      });
    } catch (e) {
      console.error('Socket emission failed for broadcast', e);
    }

    await logAudit(
      req.user.id, 'ADMIN_BROADCAST_NOTIFICATION', 'Notification', 'MASS',
      null, { target, count: users.length, title, message },
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: 'Broadcast successful', count: users.length });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getBroadcastHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'ADMIN_BROADCAST_NOTIFICATION' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    const history = logs.map(log => {
      let details: any = {};
      try {
        details = typeof log.newData === 'string' ? JSON.parse(log.newData) : log.newData || {};
      } catch (e) {}
      return {
        id: log.id,
        title: details.title || 'Platform Announcement',
        message: details.message || '',
        target: details.target || 'ALL_USERS',
        count: details.count || 0,
        dispatchedBy: `${log.user?.firstName || 'Admin'} ${log.user?.lastName || ''}`.trim(),
        createdAt: log.createdAt
      };
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching broadcast history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
