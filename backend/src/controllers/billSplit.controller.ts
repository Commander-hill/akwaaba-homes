// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';

/**
 * Create a new bill split
 */
export const createBillSplit = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = req.user?.id;
    const { propertyId, title, category, totalAmount, dueDate, notes, participants } = req.body;

    if (!propertyId || !title || !totalAmount || !participants || !participants.length) {
      res.status(400).json({ message: 'Property ID, title, total amount, and at least one roommate participant are required' });
      return;
    }

    const total = parseFloat(totalAmount);

    const billSplit = await prisma.billSplit.create({
      data: {
        creatorId,
        propertyId,
        title: title.trim(),
        category: category || 'ELECTRICITY_ECG',
        totalAmount: total,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: 'OPEN',
        participants: {
          create: participants.map((p: any) => ({
            userId: p.userId || null,
            userName: p.userName.trim(),
            userPhone: p.userPhone ? p.userPhone.trim() : null,
            userEmail: p.userEmail ? p.userEmail.trim() : null,
            shareAmount: parseFloat(p.shareAmount || (total / (participants.length + 1)).toFixed(2)),
            isPaid: Boolean(p.isPaid)
          }))
        }
      },
      include: {
        property: { select: { id: true, title: true, location: true } },
        participants: true
      }
    });

    try {
      getIO().to(creatorId).emit('bill_split_created', billSplit);
    } catch (e) { /* non-blocking */ }

    // Notify all registered roommate participants
    const registeredParticipants = (billSplit.participants || []).filter(
      (p: any) => p.userId && p.userId !== creatorId
    );
    if (registeredParticipants.length > 0) {
      try {
        await prisma.notification.createMany({
          data: registeredParticipants.map((p: any) => ({
            userId: p.userId,
            type: 'ANNOUNCEMENT',
            title: `🧾 New Bill Split: ${billSplit.title}`,
            message: `You were added to a bill split of GHS ${p.shareAmount.toFixed(2)} for ${billSplit.title}.`,
            link: '/dashboard/roommates'
          }))
        });

        for (const p of registeredParticipants) {
          getIO().to(p.userId).emit('notification', {
            type: 'ANNOUNCEMENT',
            title: `🧾 New Bill Split: ${billSplit.title}`,
            message: `You were added to a bill split of GHS ${p.shareAmount.toFixed(2)} for ${billSplit.title}.`,
            link: '/dashboard/roommates'
          });
          getIO().to(p.userId).emit('bill_split_created', billSplit);
        }
      } catch (err) {
        console.error('Error notifying bill split participants:', err);
      }
    }

    res.status(201).json({
      message: 'Bill split created! Roommates can now settle their share.',
      billSplit
    });
  } catch (error) {
    console.error('Error creating bill split:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get tenant's bill splits (created or participated)
 */
export const getTenantBillSplits = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const billSplits = await prisma.billSplit.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { userId } } }
        ]
      },
      include: {
        property: { select: { id: true, title: true, location: true } },
        participants: true,
        creator: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ billSplits });
  } catch (error) {
    console.error('Error fetching bill splits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Toggle or mark a participant share as paid
 */
export const toggleParticipantPaidStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantId } = req.params;
    const { isPaid } = req.body;

    const participant = await prisma.billSplitParticipant.findUnique({
      where: { id: participantId },
      include: { billSplit: { include: { participants: true } } }
    });

    if (!participant) {
      res.status(404).json({ message: 'Participant record not found' });
      return;
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isCreator = participant.billSplit.creatorId === userId;
    const isParticipantSelf = participant.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isCreator && !isParticipantSelf && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: You do not have permission to modify this bill split payment status' });
      return;
    }

    const updatedParticipant = await prisma.billSplitParticipant.update({
      where: { id: participantId },
      data: {
        isPaid: Boolean(isPaid),
        paidAt: isPaid ? new Date() : null
      }
    });

    // Check if all participants have paid to auto-settle the bill
    const allPaid = participant.billSplit.participants.every(p => p.id === participantId ? isPaid : p.isPaid);
    if (allPaid) {
      await prisma.billSplit.update({
        where: { id: participant.billSplitId },
        data: { status: 'SETTLED' }
      });
    } else {
      await prisma.billSplit.update({
        where: { id: participant.billSplitId },
        data: { status: 'OPEN' }
      });
    }

    res.status(200).json({
      message: isPaid ? 'Marked as settled ✅' : 'Marked as pending',
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Error updating participant payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete a bill split (creator or admin only, if not settled)
 */
export const deleteBillSplit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const billSplit = await prisma.billSplit.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!billSplit) {
      res.status(404).json({ message: 'Bill split not found' });
      return;
    }

    if (billSplit.creatorId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: Only the creator or an admin can delete this bill split' });
      return;
    }

    if (billSplit.status === 'SETTLED') {
      res.status(400).json({ message: 'Cannot delete a settled bill split' });
      return;
    }

    await prisma.billSplitParticipant.deleteMany({
      where: { billSplitId: id }
    });

    await prisma.billSplit.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Bill split deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill split:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
