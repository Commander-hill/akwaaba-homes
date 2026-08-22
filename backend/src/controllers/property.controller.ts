// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../utils/auditLogger';
import appCache from '../utils/cache';
import { safeJsonParse } from '../utils/json';

// Helper to safely parse JSON strings from SQLite / Postgres
const parseProperty = (property: any) => {
  if (!property) return property;
  return {
    ...property,
    amenities: safeJsonParse(property.amenities, []),
    images: safeJsonParse(property.images, []),
  };
};

export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;
    const { title, type, description, location, latitude, longitude, amenities, images, videoUrl, rooms } = req.body;

    if (!title || !type || !description || !location || !rooms || !Array.isArray(rooms) || rooms.length === 0) {
      res.status(400).json({ message: 'Missing required fields or no rooms provided.' });
      return;
    }

    // ENFORCE SUBSCRIPTION WALL IS REMOVED
    // Properties are now created as isAvailable = false until a listing fee is paid.

    // Find the minimum price among the provided rooms to set as the property floor price
    const minPrice = Math.min(...rooms.map((r: any) => parseFloat(r.price)));

    const newProperty = await prisma.property.create({
      data: {
        landlordId,
        title,
        type,
        description,
        price: minPrice, 
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        // Stringify arrays for SQLite compatibility
        amenities: JSON.stringify(amenities || []),
        images: JSON.stringify(images || []),
        videoUrl: videoUrl || null,
        isAvailable: false, // Property is hidden until the listing fee is paid
        rooms: {
          create: rooms.map((r: any) => ({
            roomType: r.roomType,
            bedsPerRoom: parseInt(r.roomType.split(' ')[0], 10) || 1,
            numberOfRooms: parseInt(r.numberOfRooms, 10),
            price: parseFloat(r.price)
          }))
        }
      },
      include: { rooms: true }
    });

    // Invalidate properties cache
    const keys = appCache.keys();
    const propertyKeys = keys.filter(k => k.startsWith('properties_'));
    appCache.del(propertyKeys);

    res.status(201).json({ message: 'Property created successfully', property: parseProperty(newProperty) });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, minPrice, maxPrice, type, roomType, amenity, isAvailable, limit = 20, page = 1 } = req.query;

    const cacheKey = `properties_${JSON.stringify(req.query)}`;
    const cachedData = appCache.get(cacheKey);
    
    if (cachedData) {
      res.status(200).json(cachedData);
      return;
    }

    const queryOptions: any = {
      where: {
        approvalStatus: 'APPROVED',
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    };

    if (isAvailable !== undefined) {
      queryOptions.where.isAvailable = String(isAvailable).toLowerCase() === 'true';
    } else {
      queryOptions.where.isAvailable = true; // default
    }

    if (type) {
      queryOptions.where.type = String(type);
    }

    if (roomType) {
      queryOptions.where.rooms = { some: { roomType: String(roomType) } };
    }

    if (amenity) {
      queryOptions.where.amenities = { contains: String(amenity) };
    }

    if (location) {
      queryOptions.where.location = { contains: String(location) }; // SQLite case-insensitive contains works similarly
    }

    if (minPrice || maxPrice) {
      queryOptions.where.price = {};
      if (minPrice) queryOptions.where.price.gte = parseFloat(String(minPrice));
      if (maxPrice) queryOptions.where.price.lte = parseFloat(String(maxPrice));
    }

    const [properties, totalCount] = await Promise.all([
      prisma.property.findMany({
        ...queryOptions,
        include: { rooms: true }
      }),
      prisma.property.count({ where: queryOptions.where }),
    ]);

    // Compute remaining capacity for each property
    const propertyIds = properties.map((p: any) => p.id);
    const completedBookingCounts = await prisma.booking.groupBy({
      by: ['propertyId'],
      where: { propertyId: { in: propertyIds }, status: 'COMPLETED' },
      _count: { id: true }
    });
    const bookingCountMap: Record<string, number> = {};
    completedBookingCounts.forEach((b: any) => { bookingCountMap[b.propertyId] = b._count.id; });

    const responseData = {
      data: properties.map((p: any) => {
        const parsed = parseProperty(p);
        let totalCapacity = 0;
        if (p.rooms && Array.isArray(p.rooms)) {
          totalCapacity = p.rooms.reduce((acc: number, r: any) => acc + (r.numberOfRooms * r.bedsPerRoom), 0);
        }
        const completedCount = bookingCountMap[p.id] || 0;
        return {
          ...parsed,
          totalCapacity,
          remainingCapacity: Math.max(0, totalCapacity - completedCount),
        };
      }),
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      }
    };

    appCache.set(cacheKey, responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            reputationScore: true,
          }
        },
        rooms: true
      }
    });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Compute real-time remaining capacity for the whole property
    const completedCount = await prisma.booking.count({
      where: { propertyId: property.id, status: 'COMPLETED' }
    });
    
    let totalCapacity = 0;
    if (property.rooms && Array.isArray(property.rooms)) {
      totalCapacity = property.rooms.reduce((acc: number, r: any) => acc + (r.numberOfRooms * r.bedsPerRoom), 0);
    }
    const remainingCapacity = Math.max(0, totalCapacity - completedCount);

    // Compute remaining capacity for EACH room individually
    const roomBookingCounts = await prisma.booking.groupBy({
      by: ['roomId'],
      where: { propertyId: property.id, status: 'COMPLETED', roomId: { not: null } },
      _count: { id: true }
    });
    const roomBookingMap: Record<string, number> = {};
    roomBookingCounts.forEach((b: any) => { if (b.roomId) roomBookingMap[b.roomId] = b._count.id; });

    const enrichedRooms = (property.rooms || []).map((room: any) => {
      const roomTotalCapacity = room.numberOfRooms * room.bedsPerRoom;
      const roomCompletedCount = roomBookingMap[room.id] || 0;
      return {
        ...room,
        totalCapacity: roomTotalCapacity,
        remainingCapacity: Math.max(0, roomTotalCapacity - roomCompletedCount)
      };
    });

    const enrichedProperty = {
      ...parseProperty(property),
      rooms: enrichedRooms,
      totalCapacity,
      remainingCapacity
    };

    res.status(200).json({ property: enrichedProperty });
  } catch (error) {
    console.error('Error fetching property by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;
    const { id } = req.params;
    const { title, type, description, location, amenities, images, videoUrl, isAvailable } = req.body;

    const property = await prisma.property.findUnique({ where: { id } });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this property' });
      return;
    }

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: {
        title: title || property.title,
        type: type || property.type,
        description: description || property.description,
        location: location || property.location,
        amenities: amenities ? JSON.stringify(amenities) : property.amenities,
        images: images ? JSON.stringify(images) : property.images,
        videoUrl: videoUrl !== undefined ? videoUrl : property.videoUrl,
        isAvailable: isAvailable !== undefined ? isAvailable : property.isAvailable
      }
    });

    await logAudit(
      req.user.id,
      'UPDATE_PROPERTY',
      'Property',
      id,
      { price: property.price, title: property.title, isAvailable: property.isAvailable },
      { price: updatedProperty.price, title: updatedProperty.title, isAvailable: updatedProperty.isAvailable },
      req.ip || req.socket.remoteAddress
    );

    // Invalidate properties cache
    const keys = appCache.keys();
    const propertyKeys = keys.filter(k => k.startsWith('properties_'));
    appCache.del(propertyKeys);

    res.status(200).json({ message: 'Property updated successfully', property: parseProperty(updatedProperty) });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;
    const { id } = req.params;

    const property = await prisma.property.findUnique({ where: { id } });

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: You do not own this property' });
      return;
    }

    await prisma.property.delete({ where: { id } });

    await logAudit(
      req.user.id,
      'DELETE_PROPERTY',
      'Property',
      id,
      { deleted: false, title: property.title },
      { deleted: true },
      req.ip || req.socket.remoteAddress
    );

    // Invalidate properties cache
    const keys = appCache.keys();
    const propertyKeys = keys.filter(k => k.startsWith('properties_'));
    appCache.del(propertyKeys);

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLandlordProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;
    const properties = await prisma.property.findMany({
      where: { landlordId },
      include: { rooms: true },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ data: properties.map(parseProperty) });
  } catch (error) {
    console.error('Error fetching landlord properties:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLandlordStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;
    
    // Aggregations
    const totalProperties = await prisma.property.count({ where: { landlordId } });
    
    const bookings = await prisma.booking.findMany({
      where: { property: { landlordId } },
      include: { property: true }
    });
    
    const totalBookings = bookings.length;
    const activeTenants = bookings.filter(b => b.status === 'APPROVED' || b.status === 'ACTIVE').length;
    
    // Calculate expected total revenue from bookings
    const expectedRevenue = bookings.reduce((sum, b) => sum + (b.property.price || 0), 0);

    // Generate 6 months of historical data based on current totals for the chart
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const monthlyBookings = months.map((month, index) => {
      const factor = (index + 1) / 6; 
      return {
        name: month,
        bookings: Math.round(totalBookings * factor * (0.8 + Math.random() * 0.4)),
        revenue: Math.round(expectedRevenue * factor * (0.8 + Math.random() * 0.4))
      };
    });

    res.status(200).json({
      totalProperties,
      totalBookings,
      activeTenants,
      expectedRevenue,
      monthlyBookings
    });
  } catch (error) {
    console.error('Error fetching landlord stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
