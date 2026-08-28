import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { safeJsonParse } from '../utils/json';

/**
 * Toggle property in user wishlist (Add if not present, remove if present)
 */
export const toggleWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required. Please log in.' });
      return;
    }

    const { propertyId } = req.body;

    if (!propertyId) {
      res.status(400).json({ message: 'propertyId is required' });
      return;
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_propertyId: { userId, propertyId }
      }
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { id: existing.id }
      });
      res.status(200).json({ message: 'Property removed from wishlist', isSaved: false });
      return;
    }

    await prisma.wishlist.create({
      data: { userId, propertyId }
    });

    res.status(201).json({ message: 'Property saved to wishlist', isSaved: true });
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    res.status(500).json({ message: 'Failed to update wishlist' });
  }
};

/**
 * Get all wishlisted properties for current user
 */
export const getMyWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required. Please log in.' });
      return;
    }

    const wishlists = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            rooms: { select: { price: true, roomType: true } },
            landlord: { select: { firstName: true, lastName: true, isVerifiedLandlord: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const properties = wishlists
      .map(w => w.property)
      .filter(Boolean)
      .map(p => ({
        ...p,
        amenities: safeJsonParse(p.amenities, []),
        images: safeJsonParse(p.images, [])
      }));

    const savedPropertyIds = wishlists.map(w => w.propertyId);

    res.status(200).json({ wishlists, properties, savedPropertyIds });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};

