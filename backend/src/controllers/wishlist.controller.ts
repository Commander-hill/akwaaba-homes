import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { safeJsonParse } from '../utils/json';
import { getIO } from '../socket';

/**
 * Toggle property in user wishlist (Add if not present, remove if present)
 * Also supports batch importing an array of guest-saved propertyIds (`{ propertyIds: string[] }`)
 */
export const toggleWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required. Please log in.' });
      return;
    }

    const { propertyId, propertyIds } = req.body;

    // Batch import mode for syncing browser-saved guest wishlist items upon sign-in
    if (Array.isArray(propertyIds) && propertyIds.length > 0) {
      const validProps = await prisma.property.findMany({
        where: { id: { in: propertyIds.map(String) } },
        select: { id: true }
      });

      let importedCount = 0;
      for (const p of validProps) {
        const existing = await prisma.wishlist.findUnique({
          where: { userId_propertyId: { userId, propertyId: p.id } }
        });
        if (!existing) {
          await prisma.wishlist.create({
            data: { userId, propertyId: p.id }
          });
          importedCount++;
        }
      }

      try {
        const io = getIO();
        io.to(userId).emit('wishlist_updated', { synced: true });
      } catch (e) { /* non-blocking */ }

      res.status(200).json({
        message: `Synced ${importedCount} saved ${importedCount === 1 ? 'property' : 'properties'} to your account`,
        importedCount,
        isSaved: true
      });
      return;
    }

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
      try {
        const io = getIO();
        io.to(userId).emit('wishlist_updated', { propertyId, isSaved: false });
      } catch (e) { /* non-blocking */ }

      res.status(200).json({ message: 'Property removed from wishlist', isSaved: false });
      return;
    }

    await prisma.wishlist.create({
      data: { userId, propertyId }
    });

    try {
      const io = getIO();
      io.to(userId).emit('wishlist_updated', { propertyId, isSaved: true });
    } catch (e) { /* non-blocking */ }

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
            rooms: {
              select: {
                id: true,
                price: true,
                roomType: true,
                bedsPerRoom: true,
                numberOfRooms: true,
                gender: true,
                blockName: true
              }
            },
            bookings: {
              select: {
                review: {
                  select: { rating: true }
                }
              }
            },
            landlord: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isVerifiedLandlord: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const parsedWishlists = wishlists.map((w) => {
      if (!w.property) return { ...w, property: null };

      const ratings = (w.property.bookings || [])
        .map((b: any) => b.review?.rating)
        .filter((r: any): r is number => typeof r === 'number' && r > 0);
      const reviewCount = ratings.length;
      const avgRating =
        reviewCount > 0
          ? Number((ratings.reduce((sum: number, r: number) => sum + r, 0) / reviewCount).toFixed(1))
          : null;

      const rooms = (w.property.rooms || []).map((r: any) => ({
        ...r,
        capacity: r.bedsPerRoom,
        isAvailable: true
      }));

      const totalCapacity = rooms.reduce(
        (sum: number, r: any) => sum + (Number(r.bedsPerRoom || 1) * Number(r.numberOfRooms || 1)),
        0
      );

      const { bookings, ...restProperty } = w.property as any;

      return {
        ...w,
        property: {
          ...restProperty,
          rooms,
          capacity: totalCapacity > 0 ? totalCapacity : undefined,
          billingCycle: w.property.pricePeriod || 'Academic Year',
          avgRating,
          reviewCount,
          savedAt: w.createdAt,
          amenities: safeJsonParse(w.property.amenities, []),
          images: safeJsonParse(w.property.images, []),
          includedUtilities: safeJsonParse(w.property.includedUtilities, [])
        }
      };
    });

    const properties = parsedWishlists
      .map((w) => w.property)
      .filter(Boolean);

    const savedPropertyIds = wishlists.map((w) => w.propertyId);

    res.status(200).json({ wishlists: parsedWishlists, properties, savedPropertyIds });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};


