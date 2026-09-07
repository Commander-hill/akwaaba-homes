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

      // Release dynamic genderLock if unit is now empty
      if (booking.roomUnitId) {
        await releaseUnitGenderLockIfEmpty(booking.roomUnitId, booking.id);
      }
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

/**
 * Safely resets a RoomUnit's genderLock to 'UNASSIGNED' if:
 * 1. The parent Room is mixed-gender (room.gender === 'MIXED')
 * 2. No other active/pending bookings remain in this unit
 */
export const releaseUnitGenderLockIfEmpty = async (roomUnitId: string, excludeBookingId?: string): Promise<void> => {
  try {
    const roomUnit = await prisma.roomUnit.findUnique({
      where: { id: roomUnitId },
      include: { room: true }
    });

    if (!roomUnit || roomUnit.room?.gender !== 'MIXED') {
      return;
    }

    const remainingActiveBookings = await prisma.booking.count({
      where: {
        roomUnitId,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: ['PENDING', 'APPROVED', 'CONFIRMED'] }
      }
    });

    if (remainingActiveBookings === 0) {
      await prisma.roomUnit.update({
        where: { id: roomUnitId },
        data: { genderLock: 'UNASSIGNED' }
      });
      console.log(`[GenderLock] Released unit ${roomUnit.unitNumber} (${roomUnitId}) back to UNASSIGNED.`);
    }
  } catch (err) {
    console.error(`[GenderLock] Error releasing genderLock for unit ${roomUnitId}:`, err);
  }
};
