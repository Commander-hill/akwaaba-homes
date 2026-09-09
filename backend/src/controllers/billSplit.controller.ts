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
            link: '/dashboard/tenant?tab=billsplit'
          }))
        });

        for (const p of registeredParticipants) {
          getIO().to(p.userId).emit('notification', {
            type: 'ANNOUNCEMENT',
            title: `🧾 New Bill Split: ${billSplit.title}`,
            message: `You were added to a bill split of GHS ${p.shareAmount.toFixed(2)} for ${billSplit.title}.`,
            link: '/dashboard/tenant?tab=billsplit'
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

    const updatedBillSplit = await prisma.billSplit.findUnique({
      where: { id: participant.billSplitId },
      include: {
        property: { select: { id: true, title: true, location: true } },
        participants: true,
        creator: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    try {
      const io = getIO();
      io.to(participant.billSplit.creatorId).emit('bill_split_updated', updatedBillSplit);
      if (participant.userId) {
        io.to(participant.userId).emit('bill_split_updated', updatedBillSplit);
      }

      if (isPaid) {
        if (isParticipantSelf) {
          await prisma.notification.create({
            data: {
              userId: participant.billSplit.creatorId,
              type: 'ANNOUNCEMENT',
              title: '💸 Roommate Bill Share Settled',
              message: `${participant.userName} marked their share of GHS ${participant.shareAmount.toFixed(2)} as settled for "${participant.billSplit.title}".`,
              link: '/dashboard/tenant?tab=billsplit'
            }
          }).catch(() => null);

          io.to(participant.billSplit.creatorId).emit('notification', {
            type: 'ANNOUNCEMENT',
            title: '💸 Roommate Bill Share Settled',
            message: `${participant.userName} settled GHS ${participant.shareAmount.toFixed(2)} for "${participant.billSplit.title}".`,
            link: '/dashboard/tenant?tab=billsplit'
          });
        } else if (isCreator && participant.userId) {
          await prisma.notification.create({
            data: {
              userId: participant.userId,
              type: 'ANNOUNCEMENT',
              title: '✅ Bill Share Marked Paid',
              message: `Your share of GHS ${participant.shareAmount.toFixed(2)} for "${participant.billSplit.title}" was verified and marked paid.`,
              link: '/dashboard/tenant?tab=billsplit'
            }
          }).catch(() => null);

          io.to(participant.userId).emit('notification', {
            type: 'ANNOUNCEMENT',
            title: '✅ Bill Share Marked Paid',
            message: `Your share of GHS ${participant.shareAmount.toFixed(2)} for "${participant.billSplit.title}" was marked paid.`,
            link: '/dashboard/tenant?tab=billsplit'
          });
        }
      }
    } catch (e) { /* non-blocking */ }

    res.status(200).json({
      message: isPaid ? 'Marked as settled ✅' : 'Marked as pending',
      participant: updatedParticipant,
      billSplit: updatedBillSplit
    });
  } catch (error) {
    console.error('Error updating participant payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete a bill split (creator or admin only, if not settled and no paid shares)
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

    const hasPaidParticipants = (billSplit.participants || []).some((p: any) => p.isPaid);
    if (hasPaidParticipants && userRole !== 'ADMIN') {
      res.status(400).json({ message: 'Cannot delete a bill split where roommates have already submitted paid shares. Settle or adjust the bill instead.' });
      return;
    }

    await prisma.billSplitParticipant.deleteMany({
      where: { billSplitId: id }
    });

    await prisma.billSplit.delete({
      where: { id }
    });

    try {
      const io = getIO();
      io.to(billSplit.creatorId).emit('bill_split_deleted', { id });
      (billSplit.participants || []).forEach((p: any) => {
        if (p.userId) {
          io.to(p.userId).emit('bill_split_deleted', { id });
        }
      });
    } catch (e) { /* non-blocking */ }

    res.status(200).json({ message: 'Bill split deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill split:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
