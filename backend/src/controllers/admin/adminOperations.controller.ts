import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { notifyAdminAnnouncement } from '../../utils/notification.service';
import { logAudit } from '../../utils/auditLogger';
import { emitToAll, emitToUser, getIO } from '../../socket';

export const getDisputeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
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

    // Query active escrow payouts under Dispute Holding Freeze
    const heldPayouts = dispute.property?.landlord?.id
      ? await prisma.payoutRequest.findMany({
          where: {
            landlordId: dispute.property.landlord.id,
            status: { in: ['PENDING', 'PROCESSING'] }
          },
          select: {
            id: true,
            amount: true,
            status: true,
            bankOrNetwork: true,
            accountNumber: true,
            recipientType: true,
            createdAt: true
          }
        })
      : [];

    const isEscrowFreezeActive = !['RESOLVED', 'REJECTED', 'DISMISSED'].includes(dispute.status);

    res.status(200).json({
      ...dispute,
      heldPayouts,
      isEscrowFreezeActive
    });
  } catch (error) {
    console.error('Error fetching dispute by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resolveAppeal = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
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

export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.maintenanceTicket.findMany({
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
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

export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } }
          }
        }
      }
    });

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error fetching ticket by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const adminUpdateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
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
    const { 
      target, 
      title, 
      message, 
      category = 'GENERAL_ANNOUNCEMENT',
      priority = 'NORMAL',
      channels = ['IN_APP', 'SOCKET']
    } = req.body; // target: 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS'
    
    if (!['ALL_TENANTS', 'ALL_LANDLORDS', 'ALL_USERS'].includes(target)) {
      res.status(400).json({ message: 'Invalid target group' });
      return;
    }

    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ message: 'Broadcast title and message are required' });
      return;
    }

    let users = [];
    if (target === 'ALL_TENANTS') {
      users = await prisma.user.findMany({ 
        where: { role: 'TENANT', isSuspended: false }, 
        select: { id: true, email: true, firstName: true, lastName: true } 
      });
    } else if (target === 'ALL_LANDLORDS') {
      users = await prisma.user.findMany({ 
        where: { role: 'LANDLORD', isSuspended: false }, 
        select: { id: true, email: true, firstName: true, lastName: true } 
      });
    } else {
      users = await prisma.user.findMany({ 
        where: { isSuspended: false, role: { notIn: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true, email: true, firstName: true, lastName: true } 
      });
    }

    if (users.length === 0) {
      res.status(200).json({ message: 'No eligible users found for the selected target group', count: 0 });
      return;
    }

    // 1. In-App Notifications (Database Persistence)
    if (channels.includes('IN_APP')) {
      const notificationsData = users.map(u => ({
        userId: u.id,
        title,
        message,
        type: 'ANNOUNCEMENT'
      }));

      await prisma.notification.createMany({
        data: notificationsData
      });
    }

    // 2. Real-Time Socket.IO Alert Push
    if (channels.includes('SOCKET')) {
      try {
        users.forEach(u => {
          emitToUser(u.id, 'notification', { 
            title, 
            message, 
            type: 'ANNOUNCEMENT',
            category,
            priority
          });
        });
      } catch (e) {
        console.error('Socket emission failed for broadcast', e);
      }
    }

    // 3. Institutional Email Dispatch
    if (channels.includes('EMAIL')) {
      try {
        await notifyAdminAnnouncement({
          userIds: users.map(u => u.id),
          emailList: users.map(u => ({ email: u.email, name: `${u.firstName} ${u.lastName}` })),
          subject: title,
          message
        });
      } catch (e) {
        console.error('Email broadcast failed', e);
      }
    }

    // Record Immutable Audit Log
    await logAudit(
      req.user.id, 'ADMIN_BROADCAST_NOTIFICATION', 'Notification', 'MASS',
      null, { 
        target, 
        count: users.length, 
        title, 
        message,
        category,
        priority,
        channels
      },
      req.ip || req.socket.remoteAddress
    );

    // Notify all admin dashboards of new broadcast
    try {
      emitToAll('broadcast_dispatched', { 
        target, 
        count: users.length, 
        title, 
        category,
        createdAt: new Date().toISOString() 
      });
    } catch (e) {}

    res.status(200).json({ 
      message: `Broadcast successfully dispatched to ${users.length} recipient(s)`, 
      count: users.length 
    });
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
      take: 50
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
        category: details.category || 'GENERAL_ANNOUNCEMENT',
        priority: details.priority || 'NORMAL',
        channels: Array.isArray(details.channels) ? details.channels : ['IN_APP', 'SOCKET'],
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
