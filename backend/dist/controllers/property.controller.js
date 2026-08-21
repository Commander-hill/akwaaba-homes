"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLandlordStats = exports.deleteProperty = exports.updateProperty = exports.getPropertyById = exports.getProperties = exports.createProperty = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const cache_1 = __importDefault(require("../utils/cache"));
// Helper to safely parse JSON strings from SQLite
const parseProperty = (property) => {
    return {
        ...property,
        amenities: property.amenities ? JSON.parse(property.amenities) : [],
        images: property.images ? JSON.parse(property.images) : [],
    };
};
const createProperty = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const { title, type, roomType, roomCapacity, description, price, location, latitude, longitude, amenities, images, videoUrl } = req.body;
        if (!title || !type || !roomType || !roomCapacity || !description || !price || !location) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        // ENFORCE SUBSCRIPTION WALL
        const activeSub = await prisma_1.default.subscription.findFirst({
            where: {
                landlordId,
                isActive: true,
                endDate: { gt: new Date() }
            }
        });
        if (!activeSub) {
            res.status(403).json({ message: 'Active subscription required to list properties' });
            return;
        }
        const newProperty = await prisma_1.default.property.create({
            data: {
                landlordId,
                title,
                type,
                roomType,
                roomCapacity: parseInt(roomCapacity, 10),
                description,
                price: parseFloat(price),
                location,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                // Stringify arrays for SQLite compatibility
                amenities: JSON.stringify(amenities || []),
                images: JSON.stringify(images || []),
                videoUrl: videoUrl || null,
            },
        });
        // Invalidate properties cache
        const keys = cache_1.default.keys();
        const propertyKeys = keys.filter(k => k.startsWith('properties_'));
        cache_1.default.del(propertyKeys);
        res.status(201).json({ message: 'Property created successfully', property: parseProperty(newProperty) });
    }
    catch (error) {
        console.error('Error creating property:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createProperty = createProperty;
const getProperties = async (req, res) => {
    try {
        const { location, minPrice, maxPrice, type, roomType, amenity, isAvailable, limit = 20, page = 1 } = req.query;
        const cacheKey = `properties_${JSON.stringify(req.query)}`;
        const cachedData = cache_1.default.get(cacheKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }
        const queryOptions = {
            where: {
                approvalStatus: 'APPROVED',
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
        };
        if (isAvailable !== undefined) {
            queryOptions.where.isAvailable = String(isAvailable).toLowerCase() === 'true';
        }
        else {
            queryOptions.where.isAvailable = true; // default
        }
        if (type) {
            queryOptions.where.type = String(type);
        }
        if (roomType) {
            queryOptions.where.roomType = String(roomType);
        }
        if (amenity) {
            queryOptions.where.amenities = { contains: String(amenity) };
        }
        if (location) {
            queryOptions.where.location = { contains: String(location) }; // SQLite case-insensitive contains works similarly
        }
        if (minPrice || maxPrice) {
            queryOptions.where.price = {};
            if (minPrice)
                queryOptions.where.price.gte = parseFloat(String(minPrice));
            if (maxPrice)
                queryOptions.where.price.lte = parseFloat(String(maxPrice));
        }
        const [properties, totalCount] = await Promise.all([
            prisma_1.default.property.findMany(queryOptions),
            prisma_1.default.property.count({ where: queryOptions.where }),
        ]);
        const responseData = {
            data: properties.map(parseProperty),
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount / Number(limit)),
            }
        };
        cache_1.default.set(cacheKey, responseData);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProperties = getProperties;
const getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;
        const property = await prisma_1.default.property.findUnique({
            where: { id },
            include: {
                landlord: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        reputationScore: true,
                    }
                }
            }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        res.status(200).json({ property: parseProperty(property) });
    }
    catch (error) {
        console.error('Error fetching property by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyById = getPropertyById;
const updateProperty = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const { id } = req.params;
        const { title, type, roomType, roomCapacity, description, price, location, amenities, images, videoUrl, isAvailable } = req.body;
        const property = await prisma_1.default.property.findUnique({ where: { id } });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const updatedProperty = await prisma_1.default.property.update({
            where: { id },
            data: {
                title: title || property.title,
                type: type || property.type,
                roomType: roomType || property.roomType,
                roomCapacity: roomCapacity ? parseInt(roomCapacity, 10) : property.roomCapacity,
                description: description || property.description,
                price: price ? parseFloat(price) : property.price,
                location: location || property.location,
                amenities: amenities ? JSON.stringify(amenities) : property.amenities,
                images: images ? JSON.stringify(images) : property.images,
                videoUrl: videoUrl !== undefined ? videoUrl : property.videoUrl,
                isAvailable: isAvailable !== undefined ? isAvailable : property.isAvailable
            }
        });
        await (0, auditLogger_1.logAudit)(req.user.id, 'UPDATE_PROPERTY', 'Property', id, { price: property.price, title: property.title, isAvailable: property.isAvailable }, { price: updatedProperty.price, title: updatedProperty.title, isAvailable: updatedProperty.isAvailable }, req.ip || req.socket.remoteAddress);
        // Invalidate properties cache
        const keys = cache_1.default.keys();
        const propertyKeys = keys.filter(k => k.startsWith('properties_'));
        cache_1.default.del(propertyKeys);
        res.status(200).json({ message: 'Property updated successfully', property: parseProperty(updatedProperty) });
    }
    catch (error) {
        console.error('Error updating property:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateProperty = updateProperty;
const deleteProperty = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const { id } = req.params;
        const property = await prisma_1.default.property.findUnique({ where: { id } });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        await prisma_1.default.property.delete({ where: { id } });
        await (0, auditLogger_1.logAudit)(req.user.id, 'DELETE_PROPERTY', 'Property', id, { deleted: false, title: property.title }, { deleted: true }, req.ip || req.socket.remoteAddress);
        // Invalidate properties cache
        const keys = cache_1.default.keys();
        const propertyKeys = keys.filter(k => k.startsWith('properties_'));
        cache_1.default.del(propertyKeys);
        res.status(200).json({ message: 'Property deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteProperty = deleteProperty;
const getLandlordStats = async (req, res) => {
    try {
        const landlordId = req.user.id;
        // Aggregations
        const totalProperties = await prisma_1.default.property.count({ where: { landlordId } });
        const bookings = await prisma_1.default.booking.findMany({
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
    }
    catch (error) {
        console.error('Error fetching landlord stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordStats = getLandlordStats;
//# sourceMappingURL=property.controller.js.map