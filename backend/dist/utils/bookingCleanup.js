"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseUnitGenderLockIfEmpty = exports.cleanupExpiredBookings = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const socket_1 = require("../socket");
const cache_1 = __importDefault(require("./cache"));
const EXPIRATION_MINUTES = 15;
const cleanupExpiredBookings = async () => {
    try {
        const expiryThreshold = new Date(Date.now() - EXPIRATION_MINUTES * 60 * 1000);
        const expiredBookings = await prisma_1.default.booking.findMany({
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
                await prisma_1.default.bed.update({
                    where: { id: booking.bedId },
                    data: { status: 'AVAILABLE' }
                });
            }
            // Mark booking as CANCELLED due to timeout
            await prisma_1.default.booking.update({
                where: { id: booking.id },
                data: { status: 'CANCELLED' }
            });
            // Release dynamic genderLock if unit is now empty
            if (booking.roomUnitId) {
                await (0, exports.releaseUnitGenderLockIfEmpty)(booking.roomUnitId, booking.id);
            }
        }
        // Clear memory caches so all clients fetch fresh capacity & status
        cache_1.default.flushAll();
        // Broadcast real-time socket events if socket server is active
        try {
            const io = (0, socket_1.getIO)();
            for (const b of expiredBookings) {
                io.emit('booking_updated', { bookingId: b.id, propertyId: b.propertyId });
                io.emit('property_updated', { propertyId: b.propertyId });
            }
        }
        catch (e) {
            /* socket server may not be attached in certain scripts */
        }
        return expiredBookings.length;
    }
    catch (error) {
        console.error('[AutoCleanup] Error cleaning up expired bookings:', error);
        return 0;
    }
};
exports.cleanupExpiredBookings = cleanupExpiredBookings;
/**
 * Safely resets a RoomUnit's genderLock to 'UNASSIGNED' if:
 * 1. The parent Room is mixed-gender (room.gender === 'MIXED')
 * 2. No other active/pending bookings remain in this unit
 */
const releaseUnitGenderLockIfEmpty = async (roomUnitId, excludeBookingId) => {
    try {
        const roomUnit = await prisma_1.default.roomUnit.findUnique({
            where: { id: roomUnitId },
            include: { room: true }
        });
        if (!roomUnit || roomUnit.room?.gender !== 'MIXED') {
            return;
        }
        const remainingActiveBookings = await prisma_1.default.booking.count({
            where: {
                roomUnitId,
                id: excludeBookingId ? { not: excludeBookingId } : undefined,
                status: { in: ['PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'] }
            }
        });
        if (remainingActiveBookings === 0) {
            await prisma_1.default.roomUnit.update({
                where: { id: roomUnitId },
                data: { genderLock: 'UNASSIGNED' }
            });
            console.log(`[GenderLock] Released unit ${roomUnit.unitNumber} (${roomUnitId}) back to UNASSIGNED.`);
        }
    }
    catch (err) {
        console.error(`[GenderLock] Error releasing genderLock for unit ${roomUnitId}:`, err);
    }
};
exports.releaseUnitGenderLockIfEmpty = releaseUnitGenderLockIfEmpty;
//# sourceMappingURL=bookingCleanup.js.map