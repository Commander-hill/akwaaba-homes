// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { notifyAdminAnnouncement } from '../utils/notification.service';

// Get current user's notifications (newest first)
export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark a single notification as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });

    res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark all as read
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({ where: { userId }, data: { isRead: true } });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Broadcast announcement to all users (or by role)
export const broadcastAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, message, targetRole } = req.body;

    if (!subject || !message) {
      res.status(400).json({ message: 'Subject and message are required' });
      return;
    }

    const whereClause = targetRole && targetRole !== 'ALL' ? { role: targetRole } : {};

    const users = await prisma.user.findMany({
      where: { ...whereClause, isSuspended: false },
      select: { id: true, email: true, firstName: true, lastName: true }
    });

    await notifyAdminAnnouncement({
      userIds: users.map(u => u.id),
      emailList: users.map(u => ({ email: u.email, name: `${u.firstName} ${u.lastName}` })),
      subject,
      message
    });

    res.status(200).json({ message: `Announcement sent to ${users.length} user(s)` });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
