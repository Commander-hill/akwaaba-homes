"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLandlordStats = exports.getLandlordProperties = exports.deleteProperty = exports.updateProperty = exports.getPropertyById = exports.getProperties = exports.createProperty = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const cache_1 = __importDefault(require("../utils/cache"));
const json_1 = require("../utils/json");
const socket_1 = require("../socket");
// Helper to safely parse JSON strings from SQLite / Postgres
const parseProperty = (property) => {
    if (!property)
        return property;
    return {
        ...property,
        amenities: (0, json_1.safeJsonParse)(property.amenities, []),
        images: (0, json_1.safeJsonParse)(property.images, []),
    };
};
const createProperty = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const { title, type, description, location, latitude, longitude, amenities, images, videoUrl, rooms } = req.body;
        if (!title || !type || !description || !location || !rooms || !Array.isArray(rooms) || rooms.length === 0) {
            res.status(400).json({ message: 'Missing required fields or no rooms provided.' });
            return;
        }
        // ── STRICT LANDLORD PROFILE & VERIFICATION ENFORCEMENT ──
        const landlord = await prisma_1.default.user.findUnique({
            where: { id: landlordId },
            select: {
                firstName: true, lastName: true, phoneNumber: true, gender: true,
                dateOfBirth: true, nationality: true, guardianName: true, guardianPhone: true,
                ghanaCardStatus: true
            }
        });
        const missingFields = [];
        if (!landlord?.firstName?.trim())
            missingFields.push('First Name');
        if (!landlord?.lastName?.trim())
            missingFields.push('Last Name');
        if (!landlord?.phoneNumber?.trim())
            missingFields.push('Phone Number');
        if (!landlord?.gender?.trim())
            missingFields.push('Gender');
        if (!landlord?.dateOfBirth?.trim())
            missingFields.push('Date of Birth');
        if (!landlord?.nationality?.trim())
            missingFields.push('Country / Nationality');
        if (!landlord?.guardianName?.trim())
            missingFields.push('Emergency Contact / Guardian Name');
        if (!landlord?.guardianPhone?.trim())
            missingFields.push('Emergency Contact / Guardian Phone');
        if (missingFields.length > 0) {
            res.status(403).json({
                message: `Property Listing Blocked: You must complete all required profile details before listing properties. Missing: ${missingFields.join(', ')}.`,
                redirectTo: '/dashboard/profile'
            });
            return;
        }
        if (!landlord?.ghanaCardStatus || landlord.ghanaCardStatus === 'NOT_SUBMITTED') {
            res.status(403).json({
                message: 'Property Listing Blocked: You must submit your Ghana Card details on the Verification page before listing properties.',
                redirectTo: '/dashboard/verification'
            });
            return;
        }
        // ENFORCE SUBSCRIPTION WALL IS REMOVED
        // Properties are now created as isAvailable = false until a listing fee is paid.
        // Find the minimum price among the provided rooms to set as the property floor price
        const minPrice = Math.min(...rooms.map((r) => parseFloat(r.price)));
        const newProperty = await prisma_1.default.property.create({
            data: {
                landlordId,
                title,
                type,
                description,
                price: minPrice,
                location,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                amenities: JSON.stringify(amenities || []),
                images: JSON.stringify(images || []),
                videoUrl: videoUrl || null,
                isAvailable: false, // Property is hidden until the listing fee is paid
            }
        });
        // Auto-generate Rooms, physical Room Units, and Beds
        for (const r of rooms) {
            const bedsPerRoom = parseInt(r.roomType.split(' ')[0], 10) || 1;
            const numRooms = parseInt(r.numberOfRooms, 10);
            const blockName = r.blockName || null;
            const gender = r.gender || 'MIXED';
            const createdRoom = await prisma_1.default.room.create({
                data: {
                    propertyId: newProperty.id,
                    blockName,
                    gender,
                    roomType: r.roomType,
                    bedsPerRoom,
                    numberOfRooms: numRooms,
                    price: parseFloat(r.price)
                }
            });
            // Auto-generate physical Room Units and Beds (e.g. RM 101, RM 102, Bed 1, Bed 2)
            const prefix = blockName ? `${blockName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-` : 'RM ';
            for (let i = 1; i <= numRooms; i++) {
                const unitNumber = `${prefix}${100 + i}`;
                const roomUnit = await prisma_1.default.roomUnit.create({
                    data: {
                        roomId: createdRoom.id,
                        unitNumber,
                        floor: Math.ceil(i / 10),
                        genderLock: gender !== 'MIXED' ? gender : 'UNASSIGNED',
                        bedsPerRoom,
                    }
                });
                // Create Beds for this Room Unit
                for (let b = 1; b <= bedsPerRoom; b++) {
                    await prisma_1.default.bed.create({
                        data: {
                            roomUnitId: roomUnit.id,
                            bedNumber: `Bed ${b}`,
                            status: 'AVAILABLE'
                        }
                    });
                }
            }
        }
        // Invalidate properties cache
        const keys = cache_1.default.keys();
        const propertyKeys = keys.filter(k => k.startsWith('properties_'));
        cache_1.default.del(propertyKeys);
        // Emit real-time Socket.io events
        try {
            (0, socket_1.getIO)().to(landlordId).emit('property_created', { propertyId: newProperty.id });
            (0, socket_1.getIO)().emit('property_updated', { propertyId: newProperty.id });
        }
        catch (e) {
            console.error('Socket emission failed in createProperty:', e);
        }
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
            if (minPrice)
                queryOptions.where.price.gte = parseFloat(String(minPrice));
            if (maxPrice)
                queryOptions.where.price.lte = parseFloat(String(maxPrice));
        }
        const [properties, totalCount] = await Promise.all([
            prisma_1.default.property.findMany({
                ...queryOptions,
                include: { rooms: true }
            }),
            prisma_1.default.property.count({ where: queryOptions.where }),
        ]);
        // Compute remaining capacity for each property
        const propertyIds = properties.map((p) => p.id);
        const completedBookingCounts = await prisma_1.default.booking.groupBy({
            by: ['propertyId'],
            where: { propertyId: { in: propertyIds }, status: 'COMPLETED' },
            _count: { id: true }
        });
        const bookingCountMap = {};
        completedBookingCounts.forEach((b) => { bookingCountMap[b.propertyId] = b._count.id; });
        const responseData = {
            data: properties.map((p) => {
                const parsed = parseProperty(p);
                let totalCapacity = 0;
                if (p.rooms && Array.isArray(p.rooms)) {
                    totalCapacity = p.rooms.reduce((acc, r) => acc + (r.numberOfRooms * r.bedsPerRoom), 0);
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
                },
                rooms: {
                    include: {
                        roomUnits: {
                            include: {
                                beds: {
                                    include: {
                                        bookings: {
                                            select: { id: true, status: true, tenantId: true }
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
        // Compute real-time remaining capacity for the whole property
        const completedCount = await prisma_1.default.booking.count({
            where: { propertyId: property.id, status: 'COMPLETED' }
        });
        let totalCapacity = 0;
        if (property.rooms && Array.isArray(property.rooms)) {
            totalCapacity = property.rooms.reduce((acc, r) => acc + (r.numberOfRooms * r.bedsPerRoom), 0);
        }
        const remainingCapacity = Math.max(0, totalCapacity - completedCount);
        // Compute remaining capacity for EACH room individually
        const roomBookingCounts = await prisma_1.default.booking.groupBy({
            by: ['roomId'],
            where: { propertyId: property.id, status: 'COMPLETED', roomId: { not: null } },
            _count: { id: true }
        });
        const roomBookingMap = {};
        roomBookingCounts.forEach((b) => { if (b.roomId)
            roomBookingMap[b.roomId] = b._count.id; });
        const enrichedRooms = (property.rooms || []).map((room) => {
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
        const { title, type, description, location, amenities, images, videoUrl, isAvailable } = req.body;
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
                description: description || property.description,
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
        try {
            (0, socket_1.getIO)().to(landlordId).emit('property_updated', { propertyId: updatedProperty.id });
            (0, socket_1.getIO)().emit('property_updated', { propertyId: updatedProperty.id });
        }
        catch (e) {
            console.error('Socket emission failed in updateProperty:', e);
        }
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
        try {
            (0, socket_1.getIO)().to(landlordId).emit('property_updated', { propertyId: id });
            (0, socket_1.getIO)().emit('property_updated', { propertyId: id });
        }
        catch (e) {
            console.error('Socket emission failed in deleteProperty:', e);
        }
        res.status(200).json({ message: 'Property deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteProperty = deleteProperty;
const getLandlordProperties = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const properties = await prisma_1.default.property.findMany({
            where: { landlordId },
            include: { rooms: true },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ data: properties.map(parseProperty) });
    }
    catch (error) {
        console.error('Error fetching landlord properties:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordProperties = getLandlordProperties;
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