// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';

/**
 * Post a new Compound Broadcast Notice to Residents
 */
export const createCompoundNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId, title, message, category, priority, expiresAt } = req.body;

    if (!propertyId || !title || !message) {
      res.status(400).json({ message: 'Property ID, title, and message are required' });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        bookings: {
          where: { status: { in: ['APPROVED', 'COMPLETED', 'CONFIRMED'] } },
          select: { tenantId: true }
        }
      }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this property' });
      return;
    }

    const notice = await prisma.compoundNotice.create({
      data: {
        propertyId,
        landlordId,
        title,
        message,
        category: category || 'GENERAL',
        priority: priority || 'NORMAL',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true
      }
    });

    // Broadcast in-app & socket alerts to all active tenants in this property
    const tenantIds = Array.from(new Set(property.bookings.map((b) => b.tenantId)));
    
    try {
      const io = getIO();
      for (const tId of tenantIds) {
        await prisma.notification.create({
          data: {
            userId: tId,
            type: 'ANNOUNCEMENT',
            title: `📢 Compound Notice: ${title}`,
            message: `${property.title}: ${message.substring(0, 100)}...`,
            link: '/dashboard/tenant'
          }
        }).catch(() => null);

        io.to(tId).emit('notification', {
          title: `📢 Notice for ${property.title}`,
          message: title,
          type: 'announcement'
        });
      }

      io.emit('notice_created', { notice, propertyId, propertyTitle: property.title });
    } catch (e) {
      console.warn('Socket broadcast warning:', e);
    }

    res.status(201).json({
      message: 'Notice broadcasted successfully',
      notice,
      audienceCount: tenantIds.length
    });
  } catch (error) {
    console.error('Error creating compound notice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get active notices for a property (viewable by landlord and residents)
 */
export const getPropertyNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    const notices = await prisma.compoundNotice.findMany({
      where: {
        propertyId,
        isActive: true
      },
      include: {
        property: {
          select: { id: true, title: true, location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ notices });
  } catch (error) {
    console.error('Error fetching property notices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all notices published by the current landlord
 */
export const getLandlordNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;

    const notices = await prisma.compoundNotice.findMany({
      where: { landlordId },
      include: {
        property: {
          select: { id: true, title: true, location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ notices });
  } catch (error) {
    console.error('Error fetching landlord notices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete / Archive a notice
 */
export const deleteCompoundNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { id } = req.params;

    const notice = await prisma.compoundNotice.findUnique({
      where: { id }
    });

    if (!notice) {
      res.status(404).json({ message: 'Notice not found' });
      return;
    }

    if (notice.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.compoundNotice.delete({
      where: { id }
    });

    try {
      getIO().emit('notice_updated', { noticeId: id, propertyId: notice.propertyId });
    } catch (e) { /* non-blocking */ }

    res.status(200).json({ message: 'Notice removed successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
