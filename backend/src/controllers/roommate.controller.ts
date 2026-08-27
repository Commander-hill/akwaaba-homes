import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * 4-Factor Roommate Compatibility Matching Algorithm
 */
export function calculateMatchScore(p1: any, p2: any): number {
  if (!p1 || !p2) return 75; // Default score if one profile is missing details

  let score = 0;

  // 1. Cleanliness Matching (25% weight)
  if (p1.cleanliness === p2.cleanliness) {
    score += 25;
  } else if (
    (p1.cleanliness === 'AVERAGE' || p2.cleanliness === 'AVERAGE')
  ) {
    score += 15;
  } else {
    score += 5; // NEAT vs MESSY
  }

  // 2. Sleep Habits Matching (25% weight)
  if (p1.sleepHabits === p2.sleepHabits) {
    score += 25;
  } else {
    score += 10;
  }

  // 3. Study Habits Matching (25% weight)
  if (p1.studyHabits === p2.studyHabits) {
    score += 25;
  } else {
    score += 10;
  }

  // 4. Budget Proximity Matching (25% weight)
  const maxBudget = Math.max(p1.budget, p2.budget);
  if (maxBudget > 0) {
    const diff = Math.abs(p1.budget - p2.budget) / maxBudget;
    if (diff <= 0.1) {
      score += 25;
    } else if (diff <= 0.25) {
      score += 18;
    } else if (diff <= 0.5) {
      score += 10;
    } else {
      score += 5;
    }
  } else {
    score += 25;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Get active roommate profiles sorted by compatibility match score
 */
export const getRoommateMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user.id;

    // Get current user's profile
    const myProfile = await prisma.roommateProfile.findUnique({
      where: { userId: currentUserId }
    });

    // Fetch all active profiles except current user
    const otherProfiles = await prisma.roommateProfile.findMany({
      where: {
        isActive: true,
        userId: { not: currentUserId }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            campus: true,
            programmeOfStudy: true,
            profilePictureUrl: true,
            gender: true
          }
        }
      }
    });

    const matches = otherProfiles.map((p) => {
      const matchScore = myProfile ? calculateMatchScore(myProfile, p) : 80;
      return {
        profileId: p.id,
        userId: p.userId,
        user: p.user,
        budget: p.budget,
        cleanliness: p.cleanliness,
        sleepHabits: p.sleepHabits,
        studyHabits: p.studyHabits,
        bio: p.bio,
        matchScore,
        createdAt: p.createdAt
      };
    });

    // Sort by match score descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      myProfile,
      matches
    });
  } catch (error) {
    console.error('Error fetching roommate matches:', error);
    res.status(500).json({ message: 'Failed to fetch roommate compatibility matches' });
  }
};

/**
 * Create or Update Current User's Roommate Profile
 */
export const upsertRoommateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { budget, cleanliness, sleepHabits, studyHabits, bio, isActive } = req.body;

    if (!budget || !cleanliness || !sleepHabits || !studyHabits) {
      res.status(400).json({ message: 'Budget, cleanliness, sleep habits, and study habits are required' });
      return;
    }

    const profile = await prisma.roommateProfile.upsert({
      where: { userId },
      update: {
        budget: parseFloat(budget),
        cleanliness,
        sleepHabits,
        studyHabits,
        bio,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      },
      create: {
        userId,
        budget: parseFloat(budget),
        cleanliness,
        sleepHabits,
        studyHabits,
        bio,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(200).json({ message: 'Roommate profile updated successfully', profile });
  } catch (error) {
    console.error('Error updating roommate profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send a Split Room Invitation to a Compatible Roommate
 */
export const sendRoommateInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = req.user.id;
    const { receiverId, propertyId, roomUnitId, message } = req.body;

    if (!receiverId) {
      res.status(400).json({ message: 'Receiver student ID is required' });
      return;
    }

    if (senderId === receiverId) {
      res.status(400).json({ message: 'You cannot invite yourself' });
      return;
    }

    // Check compatibility match score
    const senderProfile = await prisma.roommateProfile.findUnique({ where: { userId: senderId } });
    const receiverProfile = await prisma.roommateProfile.findUnique({ where: { userId: receiverId } });

    const matchScore = calculateMatchScore(senderProfile, receiverProfile);

    // Prevent duplicate pending invitations
    const existing = await prisma.roommateInvitation.findFirst({
      where: {
        senderId,
        receiverId,
        status: 'PENDING'
      }
    });

    if (existing) {
      res.status(400).json({ message: 'You already have an active pending invitation sent to this roommate.' });
      return;
    }

    const invitation = await prisma.roommateInvitation.create({
      data: {
        senderId,
        receiverId,
        propertyId: propertyId || null,
        roomUnitId: roomUnitId || null,
        matchScore,
        message: message || 'Hey! Let us team up and share a room at this hostel.'
      },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        receiver: { select: { firstName: true, lastName: true } },
        property: { select: { title: true } }
      }
    });

    // Create in-app notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'ANNOUNCEMENT',
        title: '🤝 New Roommate Invitation!',
        message: `${invitation.sender.firstName} ${invitation.sender.lastName} invited you to split a room (${matchScore}% Compatible match)!`,
        link: '/dashboard/roommates'
      }
    });

    res.status(201).json({ message: 'Roommate split invitation sent successfully', invitation });
  } catch (error) {
    console.error('Error sending roommate invitation:', error);
    res.status(500).json({ message: 'Failed to send roommate invitation' });
  }
};

/**
 * Get Sent & Received Roommate Invitations
 */
export const getMyRoommateInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const received = await prisma.roommateInvitation.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            campus: true,
            programmeOfStudy: true,
            profilePictureUrl: true
          }
        },
        property: { select: { id: true, title: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const sent = await prisma.roommateInvitation.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            campus: true,
            programmeOfStudy: true,
            profilePictureUrl: true
          }
        },
        property: { select: { id: true, title: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ received, sent });
  } catch (error) {
    console.error('Error fetching roommate invitations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Respond to Roommate Invitation (ACCEPT or REJECT)
 */
export const respondToRoommateInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const id = req.params.id as string;
    const { status } = req.body; // ACCEPTED or REJECTED

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      res.status(400).json({ message: 'Status must be ACCEPTED or REJECTED' });
      return;
    }

    const invitation = await prisma.roommateInvitation.findUnique({
      where: { id }
    });

    if (!invitation || invitation.receiverId !== userId) {
      res.status(404).json({ message: 'Invitation not found or unauthorized' });
      return;
    }

    const updated = await prisma.roommateInvitation.update({
      where: { id },
      data: { status }
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: invitation.senderId,
        type: 'ANNOUNCEMENT',
        title: status === 'ACCEPTED' ? '🎉 Roommate Invitation Accepted!' : 'Roommate Invitation Response',
        message: `Your roommate split invitation was ${status.toLowerCase()} by the student.`,
        link: '/dashboard/roommates'
      }
    });

    res.status(200).json({ message: `Invitation ${status.toLowerCase()} successfully`, invitation: updated });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
