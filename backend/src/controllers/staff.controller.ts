// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Assign Staff (Caretaker/Porter/Manager) to a Property by Email
 */
export const assignStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId, email, role, canManageTickets, canCheckInTenants, canPostNotices } = req.body;

    if (!propertyId || !email) {
      res.status(400).json({ message: 'Property ID and staff email are required' });
      return;
    }

    const property = await prisma.property.findUnique({
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

    const staffEmail = String(email).toLowerCase().trim();
    const staffUser = await prisma.user.findUnique({
      where: { email: staffEmail }
    });

    if (!staffUser) {
      res.status(404).json({ message: `No registered account found with email "${staffEmail}". Please ask your caretaker to register on Akwaaba Homes first.` });
      return;
    }

    if (staffUser.id === landlordId) {
      res.status(400).json({ message: 'You cannot assign yourself as staff on your own property.' });
      return;
    }

    const assignment = await prisma.propertyStaff.upsert({
      where: {
        propertyId_userId: {
          propertyId,
          userId: staffUser.id
        }
      },
      update: {
        role: role || 'CARETAKER',
        canManageTickets: canManageTickets !== undefined ? canManageTickets : true,
        canCheckInTenants: canCheckInTenants !== undefined ? canCheckInTenants : true,
        canPostNotices: canPostNotices !== undefined ? canPostNotices : true
      },
      create: {
        propertyId,
        landlordId: property.landlordId,
        userId: staffUser.id,
        role: role || 'CARETAKER',
        canManageTickets: canManageTickets !== undefined ? canManageTickets : true,
        canCheckInTenants: canCheckInTenants !== undefined ? canCheckInTenants : true,
        canPostNotices: canPostNotices !== undefined ? canPostNotices : true
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true }
        }
      }
    });

    res.status(200).json({ message: `Staff member "${staffUser.firstName} ${staffUser.lastName}" assigned successfully!`, assignment });
  } catch (error: any) {
    console.error('Error assigning staff:', error);
    res.status(500).json({ message: error.message || 'Internal server error while assigning staff' });
  }
};

/**
 * Get Staff assigned to Landlord's Properties
 */
export const getPropertyStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId } = req.query;

    const where: any = { landlordId };
    if (propertyId && typeof propertyId === 'string') {
      where.propertyId = propertyId;
    }

    const staff = await prisma.propertyStaff.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true }
        },
        property: {
          select: { id: true, title: true, location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ staff });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Remove Staff Assignment
 */
export const removeStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { id } = req.params;

    const assignment = await prisma.propertyStaff.findUnique({
      where: { id }
    });

    if (!assignment) {
      res.status(404).json({ message: 'Staff assignment not found' });
      return;
    }

    if (assignment.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.propertyStaff.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Staff assignment removed successfully' });
  } catch (error) {
    console.error('Error removing staff assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Properties and Operations assigned to the logged-in Caretaker/Staff
 */
export const getMyStaffAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    const userEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';

    const assignments = await prisma.propertyStaff.findMany({
      where: {
        OR: [
          { userId },
          ...(userEmail ? [{ user: { email: userEmail } }] : [])
        ]
      },
      include: {
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
            tickets: {
              include: {
                tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
                room: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            compoundNotices: { orderBy: { createdAt: 'desc' } },
            visitorPasses: { orderBy: { createdAt: 'desc' } },
            packageDeliveries: { orderBy: { createdAt: 'desc' } },
            bookings: {
              where: { status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] } },
              include: {
                tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true } },
                room: true,
                inspections: true,
              },
              orderBy: { createdAt: 'desc' },
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ assignments });
  } catch (error: any) {
    console.error('Error fetching staff assignments:', error);
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};
