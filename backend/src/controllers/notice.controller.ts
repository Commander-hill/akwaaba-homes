// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../utils/auditLogger';

export const getActiveNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const notices = await prisma.notice.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' }
    });
    res.status(200).json(notices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    res.status(200).json(notices);
  } catch (error) {
    console.error('Error fetching all notices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIndex, topLabel, title, description, buttonText, buttonLink, iconType, isActive } = req.body;
    
    const notice = await prisma.notice.create({
      data: {
        orderIndex: orderIndex || 0,
        topLabel,
        title,
        description,
        buttonText,
        buttonLink,
        iconType,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    await logAudit(
      req.user.id,
      'CREATE_NOTICE',
      'Notice',
      notice.id,
      null,
      notice,
      req.ip || req.socket.remoteAddress
    );

    res.status(201).json({ message: 'Notice created successfully', notice });
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { orderIndex, topLabel, title, description, buttonText, buttonLink, iconType, isActive } = req.body;
    
    const oldNotice = await prisma.notice.findUnique({ where: { id } });
    if (!oldNotice) {
      res.status(404).json({ message: 'Notice not found' });
      return;
    }

    const notice = await prisma.notice.update({
      where: { id },
      data: {
        orderIndex: orderIndex !== undefined ? orderIndex : oldNotice.orderIndex,
        topLabel: topLabel !== undefined ? topLabel : oldNotice.topLabel,
        title: title || oldNotice.title,
        description: description || oldNotice.description,
        buttonText: buttonText !== undefined ? buttonText : oldNotice.buttonText,
        buttonLink: buttonLink !== undefined ? buttonLink : oldNotice.buttonLink,
        iconType: iconType !== undefined ? iconType : oldNotice.iconType,
        isActive: isActive !== undefined ? isActive : oldNotice.isActive
      }
    });

    await logAudit(
      req.user.id,
      'UPDATE_NOTICE',
      'Notice',
      id,
      oldNotice,
      notice,
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: 'Notice updated successfully', notice });
  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      res.status(404).json({ message: 'Notice not found' });
      return;
    }

    await prisma.notice.delete({ where: { id } });

    await logAudit(
      req.user.id,
      'DELETE_NOTICE',
      'Notice',
      id,
      notice,
      null,
      req.ip || req.socket.remoteAddress
    );

    res.status(200).json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
