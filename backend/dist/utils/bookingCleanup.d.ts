export declare const cleanupExpiredBookings: () => Promise<number>;
/**
 * Safely resets a RoomUnit's genderLock to 'UNASSIGNED' if:
 * 1. The parent Room is mixed-gender (room.gender === 'MIXED')
 * 2. No other active/pending bookings remain in this unit
 */
export declare const releaseUnitGenderLockIfEmpty: (roomUnitId: string, excludeBookingId?: string) => Promise<void>;
//# sourceMappingURL=bookingCleanup.d.ts.map