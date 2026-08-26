import prisma from './prisma';
import { getIO } from '../socket';
import appCache from './cache';

const EXPIRATION_MINUTES = 15;

export const cleanupExpiredBookings = async (): Promise<number> => {
  try {
    const expiryThreshold = new Date(Date.now() - EXPIRATION_MINUTES * 60 * 1000);

    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: expiryThreshold
        }
      },
      include: {
        bed: true
      }
    });

    if (expiredBookings.length === 0) {
      return 0;
    }

    console.log(`[AutoCleanup] Found ${expiredBookings.length} expired pending booking(s) older than ${EXPIRATION_MINUTES} mins.`);

    for (const booking of expiredBookings) {
      // Release reserved bed if assigned
      if (booking.bedId) {
        await prisma.bed.update({
          where: { id: booking.bedId },
          data: { status: 'AVAILABLE' }
        });
      }

      // Mark booking as CANCELLED due to timeout
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' }
      });
    }

    // Clear memory caches so all clients fetch fresh capacity & status
    appCache.flushAll();

    // Broadcast real-time socket events if socket server is active
    try {
      const io = getIO();
      for (const b of expiredBookings) {
        io.emit('booking_updated', { bookingId: b.id, propertyId: b.propertyId });
        io.emit('property_updated', { propertyId: b.propertyId });
      }
    } catch (e) {
      /* socket server may not be attached in certain scripts */
    }

    return expiredBookings.length;
  } catch (error) {
    console.error('[AutoCleanup] Error cleaning up expired bookings:', error);
    return 0;
  }
};
