// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getIO } from '../socket';
import appCache from '../utils/cache';

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId, roomType, numberOfRooms, price, blockName, gender } = req.body;
    const landlordId = req.user.id;

    if (!propertyId || !roomType || !numberOfRooms || !price) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // Validate gender if provided
    const validGenders = ['MALE', 'FEMALE', 'MIXED'];
    const roomGender = gender && validGenders.includes(gender.toUpperCase()) ? gender.toUpperCase() : 'MIXED';

    const property = await prisma.property.findUnique({
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

    const room = await prisma.room.create({
      data: {
        propertyId,
        blockName: blockName || null,
        gender: roomGender,
        roomType,
        bedsPerRoom,
        numberOfRooms: parseInt(numberOfRooms, 10),
        price: parseFloat(price)
      }
    });

    // Update property min price
    const minRoom = await prisma.room.findFirst({
      where: { propertyId },
      orderBy: { price: 'asc' }
    });
    
    if (minRoom) {
      await prisma.property.update({
        where: { id: propertyId },
        data: { price: minRoom.price }
      });
    }

    try {
      getIO().emit('room_updated', { roomId: room.id, propertyId });
      getIO().emit('property_updated', { propertyId });
      appCache.flushAll();
    } catch (e) {
      /* non-blocking */
    }

    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roomType, numberOfRooms, price, blockName, gender } = req.body;
    const landlordId = req.user.id;

    const room = await prisma.room.findUnique({
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

    const validGenders = ['MALE', 'FEMALE', 'MIXED'];
    const dataToUpdate: any = {};
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
    if (blockName !== undefined) {
      dataToUpdate.blockName = blockName || null;
    }
    if (gender && validGenders.includes(gender.toUpperCase())) {
      dataToUpdate.gender = gender.toUpperCase();
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: dataToUpdate
    });

    // Update property min price if price changed
    if (price !== undefined) {
      const minRoom = await prisma.room.findFirst({
        where: { propertyId: room.propertyId },
        orderBy: { price: 'asc' }
      });
      if (minRoom) {
        await prisma.property.update({
          where: { id: room.propertyId },
          data: { price: minRoom.price }
        });
      }
    }

    try {
      getIO().emit('room_updated', { roomId: id, propertyId: room.propertyId });
      getIO().emit('property_updated', { propertyId: room.propertyId });
      appCache.flushAll();
    } catch (e) {
      /* non-blocking */
    }

    res.status(200).json({ message: 'Room updated successfully', room: updatedRoom });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const landlordId = req.user.id;

    const room = await prisma.room.findUnique({
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
    const activeBookings = await prisma.booking.count({
      where: {
        roomId: id,
        status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] }
      }
    });

    if (activeBookings > 0) {
      res.status(400).json({ message: 'Cannot delete room with active or completed bookings.' });
      return;
    }

    await prisma.room.delete({ where: { id } });

    // Update property min price
    const minRoom = await prisma.room.findFirst({
      where: { propertyId: room.propertyId },
      orderBy: { price: 'asc' }
    });
    
    await prisma.property.update({
      where: { id: room.propertyId },
      data: { price: minRoom ? minRoom.price : 0 }
    });

    try {
      getIO().emit('room_updated', { roomId: id, propertyId: room.propertyId });
      getIO().emit('property_updated', { propertyId: room.propertyId });
      appCache.flushAll();
    } catch (e) {
      /* non-blocking */
    }

    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRoomsByProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const rooms = await prisma.room.findMany({
      where: { propertyId },
      orderBy: { price: 'asc' }
    });
    res.status(200).json({ rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
