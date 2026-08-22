"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoomsByProperty = exports.deleteRoom = exports.updateRoom = exports.createRoom = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const createRoom = async (req, res) => {
    try {
        const { propertyId, roomType, numberOfRooms, price } = req.body;
        const landlordId = req.user.id;
        if (!propertyId || !roomType || !numberOfRooms || !price) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const bedsPerRoom = parseInt(roomType.split(' ')[0], 10) || 1;
        const room = await prisma_1.default.room.create({
            data: {
                propertyId,
                roomType,
                bedsPerRoom,
                numberOfRooms: parseInt(numberOfRooms, 10),
                price: parseFloat(price)
            }
        });
        // Update property min price
        const minRoom = await prisma_1.default.room.findFirst({
            where: { propertyId },
            orderBy: { price: 'asc' }
        });
        if (minRoom) {
            await prisma_1.default.property.update({
                where: { id: propertyId },
                data: { price: minRoom.price }
            });
        }
        res.status(201).json({ message: 'Room created successfully', room });
    }
    catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createRoom = createRoom;
const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { roomType, numberOfRooms, price } = req.body;
        const landlordId = req.user.id;
        const room = await prisma_1.default.room.findUnique({
            where: { id },
            include: { property: true }
        });
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }
        if (room.property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const dataToUpdate = {};
        if (roomType) {
            dataToUpdate.roomType = roomType;
            dataToUpdate.bedsPerRoom = parseInt(roomType.split(' ')[0], 10) || 1;
        }
        if (numberOfRooms !== undefined) {
            dataToUpdate.numberOfRooms = parseInt(numberOfRooms, 10);
        }
        if (price !== undefined) {
            dataToUpdate.price = parseFloat(price);
        }
        const updatedRoom = await prisma_1.default.room.update({
            where: { id },
            data: dataToUpdate
        });
        // Update property min price if price changed
        if (price !== undefined) {
            const minRoom = await prisma_1.default.room.findFirst({
                where: { propertyId: room.propertyId },
                orderBy: { price: 'asc' }
            });
            if (minRoom) {
                await prisma_1.default.property.update({
                    where: { id: room.propertyId },
                    data: { price: minRoom.price }
                });
            }
        }
        res.status(200).json({ message: 'Room updated successfully', room: updatedRoom });
    }
    catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateRoom = updateRoom;
const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const landlordId = req.user.id;
        const room = await prisma_1.default.room.findUnique({
            where: { id },
            include: { property: true }
        });
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }
        if (room.property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        // Check if there are active bookings
        const activeBookings = await prisma_1.default.booking.count({
            where: {
                roomId: id,
                status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] }
            }
        });
        if (activeBookings > 0) {
            res.status(400).json({ message: 'Cannot delete room with active or completed bookings.' });
            return;
        }
        await prisma_1.default.room.delete({ where: { id } });
        // Update property min price
        const minRoom = await prisma_1.default.room.findFirst({
            where: { propertyId: room.propertyId },
            orderBy: { price: 'asc' }
        });
        await prisma_1.default.property.update({
            where: { id: room.propertyId },
            data: { price: minRoom ? minRoom.price : 0 }
        });
        res.status(200).json({ message: 'Room deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteRoom = deleteRoom;
const getRoomsByProperty = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const rooms = await prisma_1.default.room.findMany({
            where: { propertyId },
            orderBy: { price: 'asc' }
        });
        res.status(200).json({ rooms });
    }
    catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getRoomsByProperty = getRoomsByProperty;
//# sourceMappingURL=room.controller.js.map