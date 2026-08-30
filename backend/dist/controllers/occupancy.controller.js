"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBedStatus = exports.getPropertyOccupancyMatrix = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
/**
 * Get full visual Floorplan & Bed Occupancy Matrix for a property
 */
const getPropertyOccupancyMatrix = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId },
            include: {
                rooms: {
                    include: {
                        roomUnits: {
                            include: {
                                beds: {
                                    include: {
                                        bookings: {
                                            where: {
                                                status: { in: ['PENDING', 'APPROVED', 'COMPLETED', 'CONFIRMED'] }
                                            },
                                            include: {
                                                tenant: {
                                                    select: {
                                                        id: true,
                                                        firstName: true,
                                                        lastName: true,
                                                        email: true,
                                                        phoneNumber: true,
                                                        avatarUrl: true,
                                                        campus: true,
                                                        studentId: true
                                                    }
                                                }
                                            },
                                            orderBy: { createdAt: 'desc' },
                                            take: 1
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== userId && userRole !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        let totalBeds = 0;
        let occupiedBeds = 0;
        let reservedBeds = 0;
        let maintenanceBeds = 0;
        let availableBeds = 0;
        const matrix = property.rooms.map((room) => {
            return {
                roomId: room.id,
                blockName: room.blockName || 'General Wing',
                roomType: room.roomType,
                gender: room.gender,
                price: room.price,
                units: room.roomUnits.map((unit) => {
                    return {
                        unitId: unit.id,
                        unitNumber: unit.unitNumber,
                        floor: unit.floor,
                        genderLock: unit.genderLock,
                        beds: unit.beds.map((bed) => {
                            totalBeds++;
                            const activeBooking = bed.bookings[0] || null;
                            let effectiveStatus = bed.status;
                            if (effectiveStatus === 'MAINTENANCE') {
                                maintenanceBeds++;
                            }
                            else if (activeBooking) {
                                if (activeBooking.status === 'COMPLETED' || activeBooking.status === 'APPROVED' || activeBooking.status === 'CONFIRMED') {
                                    effectiveStatus = 'OCCUPIED';
                                    occupiedBeds++;
                                }
                                else if (activeBooking.status === 'PENDING') {
                                    effectiveStatus = 'PENDING';
                                    reservedBeds++;
                                }
                            }
                            else {
                                effectiveStatus = 'AVAILABLE';
                                availableBeds++;
                            }
                            return {
                                bedId: bed.id,
                                bedNumber: bed.bedNumber,
                                status: effectiveStatus,
                                occupant: activeBooking ? {
                                    tenantId: activeBooking.tenant.id,
                                    name: `${activeBooking.tenant.firstName} ${activeBooking.tenant.lastName}`,
                                    avatarUrl: activeBooking.tenant.avatarUrl,
                                    phone: activeBooking.tenant.phoneNumber,
                                    email: activeBooking.tenant.email,
                                    startDate: activeBooking.startDate,
                                    endDate: activeBooking.endDate,
                                    bookingStatus: activeBooking.status,
                                    bookingId: activeBooking.id
                                } : null
                            };
                        })
                    };
                })
            };
        });
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
        res.status(200).json({
            propertyId: property.id,
            title: property.title,
            location: property.location,
            stats: {
                totalBeds,
                occupiedBeds,
                reservedBeds,
                maintenanceBeds,
                availableBeds,
                occupancyRate
            },
            matrix
        });
    }
    catch (error) {
        console.error('Error fetching occupancy matrix:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyOccupancyMatrix = getPropertyOccupancyMatrix;
/**
 * Update individual Bed status (e.g. mark bed as MAINTENANCE or AVAILABLE)
 */
const updateBedStatus = async (req, res) => {
    try {
        const { bedId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        if (!['AVAILABLE', 'MAINTENANCE', 'RESERVED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status. Must be AVAILABLE, MAINTENANCE, or RESERVED' });
            return;
        }
        const bed = await prisma_1.default.bed.findUnique({
            where: { id: bedId },
            include: {
                roomUnit: {
                    include: {
                        room: {
                            include: {
                                property: true
                            }
                        }
                    }
                }
            }
        });
        if (!bed) {
            res.status(404).json({ message: 'Bed slot not found' });
            return;
        }
        const property = bed.roomUnit.room.property;
        if (property.landlordId !== userId && userRole !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const updatedBed = await prisma_1.default.bed.update({
            where: { id: bedId },
            data: { status }
        });
        try {
            (0, socket_1.getIO)().emit('room_capacity_updated', { propertyId: property.id, bedId });
            (0, socket_1.getIO)().emit('room_updated', { propertyId: property.id });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({ message: `Bed status updated to ${status}`, bed: updatedBed });
    }
    catch (error) {
        console.error('Error updating bed status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateBedStatus = updateBedStatus;
//# sourceMappingURL=occupancy.controller.js.map