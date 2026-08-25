// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';
import appCache from '../utils/cache';

// Helper: recalculate a tenant's reputation score from all their reviews
const recalculateReputation = async (tenantId: string) => {
  // Get all reviews for completed bookings by this tenant
  const reviews = await prisma.review.findMany({
    where: {
      booking: { tenantId },
      isFlagged: false,     // Exclude flagged/moderated reviews from scoring
      isModerated: false
    },
    select: { rating: true }
  });

  if (reviews.length === 0) return; // Keep default 5.0 if no reviews yet

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await prisma.user.update({
    where: { id: tenantId },
    data: { reputationScore: parseFloat(avg.toFixed(2)) }
  });
};

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.user.id;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || rating === undefined || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Valid bookingId and rating (1-5) are required' });
      return;
    }

    // RULE 1: Booking must exist
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // RULE 2: Only the tenant who made the booking can review
    if (booking.tenantId !== authorId) {
      res.status(403).json({ message: 'Forbidden: You did not make this booking' });
      return;
    }

    // RULE 3: Stay must be completed
    if (booking.status !== 'COMPLETED') {
      res.status(400).json({ message: 'Reviews can only be submitted after a completed stay' });
      return;
    }

    // RULE 4: One review per booking
    const existingReview = await prisma.review.findUnique({ where: { bookingId } });
    if (existingReview) {
      res.status(400).json({ message: 'A review has already been submitted for this stay' });
      return;
    }

    const review = await prisma.review.create({
      data: { bookingId, authorId, rating, comment }
    });

    // Auto-recalculate tenant reputation score after new review
    await recalculateReputation(booking.tenantId);

    try {
      getIO().emit('review_created', review);
      getIO().emit('property_updated', { propertyId: booking.propertyId });
      appCache.flushAll();
    } catch (e) {}

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPropertyReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        booking: { propertyId },
        isFlagged: false,    // Only show non-flagged reviews to public
        isModerated: false
      },
      include: {
        author: { select: { firstName: true, lastName: true, reputationScore: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute aggregate stats
    const allRatings = reviews.map(r => r.rating);
    const avgRating = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length) : null;

    res.status(200).json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (error) {
    console.error('Error fetching property reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tenant flags a review for admin moderation
export const flagReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    await prisma.review.update({
      where: { id },
      data: { isFlagged: true, moderationNote: reason || 'Flagged for review' }
    });

    try {
      getIO().emit('review_updated', { id });
      appCache.flushAll();
    } catch (e) {}

    res.status(200).json({ message: 'Review flagged for admin moderation' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tenant submits an appeal on a moderated/flagged review
export const submitAppeal = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.user.id;
    const { id } = req.params;
    const { appealNote } = req.body;

    if (!appealNote) {
      res.status(400).json({ message: 'Appeal justification is required' });
      return;
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    if (review.authorId !== authorId) {
      res.status(403).json({ message: 'Forbidden: This is not your review' });
      return;
    }

    if (review.appealStatus === 'PENDING') {
      res.status(400).json({ message: 'An appeal is already pending for this review' });
      return;
    }

    await prisma.review.update({
      where: { id },
      data: { appealNote, appealStatus: 'PENDING' }
    });

    try {
      getIO().emit('review_updated', { id });
      appCache.flushAll();
    } catch (e) {}

    res.status(200).json({ message: 'Appeal submitted successfully. An admin will review it shortly.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get tenant's own reviews with appeal/flag status
export const getMyReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.user.id;

    const reviews = await prisma.review.findMany({
      where: { authorId },
      include: {
        booking: {
          include: { property: { select: { title: true, location: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ reviews });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
