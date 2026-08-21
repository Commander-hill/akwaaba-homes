// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { refreshToken: currentRefreshToken } = req.cookies;

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActive: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        deviceFamily: true,
        osFamily: true,
        lastActive: true,
        createdAt: true,
        refreshToken: true // Need this internally to determine which is "current"
      }
    });

    // Map to mark which one is the current session
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceFamily: s.deviceFamily,
      osFamily: s.osFamily,
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      isCurrentSession: s.refreshToken === currentRefreshToken
    }));

    res.status(200).json({ sessions: formattedSessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const session = await prisma.session.findUnique({ where: { id } });

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.session.update({
      where: { id },
      data: { isValid: false }
    });

    res.status(200).json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
