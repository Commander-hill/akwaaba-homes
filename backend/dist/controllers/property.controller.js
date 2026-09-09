"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLandlordStats = exports.getLandlordProperties = exports.deleteProperty = exports.updateProperty = exports.getPropertyById = exports.getProperties = exports.createProperty = exports.parseBedsPerRoom = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const cache_1 = __importDefault(require("../utils/cache"));
const json_1 = require("../utils/json");
const socket_1 = require("../socket");
// Helper to safely parse beds per room from any room type string (e.g. "2 in a room" -> 2)
const parseBedsPerRoom = (roomType) => {
    if (!roomType)
        return 1;
    const str = roomType.toLowerCase().trim();
    if (str.includes('4') || str.includes('four'))
        return 4;
    if (str.includes('3') || str.includes('three'))
        return 3;
    if (str.includes('2') || str.includes('two') || str.includes('double') || str.includes('twin'))
        return 2;
    if (str.includes('1') || str.includes('one') || str.includes('single'))
        return 1;
    const match = str.match(/\d+/);
    if (match)
        return parseInt(match[0], 10);
    return 1;
};
exports.parseBedsPerRoom = parseBedsPerRoom;
// Helper to safely parse JSON strings from SQLite / Postgres
const parseProperty = (property) => {
    if (!property)
        return property;
    return {
        ...property,
        amenities: (0, json_1.safeJsonParse)(property.amenities, []),
        images: (0, json_1.safeJsonParse)(property.images, []),
        includedUtilities: (0, json_1.safeJsonParse)(property.includedUtilities, []),
    };
};
const createProperty = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const { title, type, targetAudience, furnishing, pricePeriod, gateLockTime, visitorPolicy, quietHours, paymentSchedule, cautionDeposit, includedUtilities, description, location, latitude, longitude, amenities, images, videoUrl, rooms } = req.body;
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
                ghanaCardStatus: true, isSuspended: true
            }
        });
        if (landlord?.isSuspended && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: Your landlord account is suspended. You cannot list new properties.' });
            return;
        }
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
                targetAudience: targetAudience || 'Open to All',
                furnishing: furnishing || 'Unfurnished',
                pricePeriod: pricePeriod || 'Academic Year',
                gateLockTime: gateLockTime || 'No Curfew / 24/7 Access',
                visitorPolicy: visitorPolicy || 'Day visitors allowed until 8 PM',
                quietHours: quietHours || 'From 10:00 PM',
                paymentSchedule: paymentSchedule || 'Full Upfront',
                cautionDeposit: cautionDeposit ? parseFloat(cautionDeposit) : 0,
                includedUtilities: JSON.stringify(includedUtilities || []),
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
            const bedsPerRoom = (0, exports.parseBedsPerRoom)(r.roomType);
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
        // Alert admins of newly submitted property awaiting approval
        const admins = await prisma_1.default.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        if (admins.length > 0) {
            await prisma_1.default.notification.createMany({
                data: admins.map(a => ({
                    userId: a.id,
                    type: 'SYSTEM_ALERT',
                    title: '🏢 New Property Awaiting Approval',
                    message: `Landlord submitted "${newProperty.title}" in ${newProperty.location} for verification.`,
                    link: '/admin/properties'
                }))
            }).catch(() => null);
        }
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
        const { location, minPrice, maxPrice, type, roomType, amenity, isAvailable, targetAudience, furnishing, pricePeriod, limit = 20, page = 1 } = req.query;
        const cacheKey = `properties_${JSON.stringify(req.query)}`;
        const cachedData = cache_1.default.get(cacheKey);
        if (cachedData) {
            res.status(200).json(cachedData);
            return;
        }
        const queryOptions = {
            where: {
                approvalStatus: 'APPROVED',
                landlord: { isSuspended: false }
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
        if (targetAudience) {
            queryOptions.where.targetAudience = String(targetAudience);
        }
        if (furnishing) {
            queryOptions.where.furnishing = String(furnishing);
        }
        if (pricePeriod) {
            queryOptions.where.pricePeriod = String(pricePeriod);
        }
        if (roomType) {
            queryOptions.where.rooms = { some: { roomType: String(roomType) } };
        }
        if (amenity) {
            queryOptions.where.amenities = { contains: String(amenity), mode: 'insensitive' };
        }
        if (location) {
            const locStr = String(location).trim();
            queryOptions.where.OR = [
                { location: { contains: locStr, mode: 'insensitive' } },
                { title: { contains: locStr, mode: 'insensitive' } },
                { description: { contains: locStr, mode: 'insensitive' } },
            ];
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
                include: {
                    rooms: true,
                    landlord: {
                        select: { id: true, firstName: true, lastName: true, isVerifiedLandlord: true, landlordVerificationStatus: true }
                    }
                }
            }),
            prisma_1.default.property.count({ where: queryOptions.where }),
        ]);
        // Compute remaining capacity for each property
        const propertyIds = properties.map((p) => p.id);
        const completedBookingCounts = await prisma_1.default.booking.groupBy({
            by: ['propertyId'],
            where: { propertyId: { in: propertyIds }, status: { in: ['COMPLETED', 'ACTIVE', 'CHECKED_IN'] } },
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
                        isVerifiedLandlord: true,
                        landlordVerificationStatus: true,
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
        // Query real-time active bookings for this property
        const activePropertyBookings = await prisma_1.default.booking.findMany({
            where: {
                propertyId: property.id,
                status: { in: ['COMPLETED', 'APPROVED', 'CONFIRMED', 'PENDING', 'ACTIVE', 'CHECKED_IN'] }
            },
            select: {
                id: true,
                roomId: true,
                roomUnitId: true,
                bedId: true,
                status: true,
                tenantId: true
            }
        });
        const activeBedIds = new Set(activePropertyBookings.map(b => b.bedId).filter(Boolean));
        const activeUnitIds = new Set(activePropertyBookings.map(b => b.roomUnitId).filter(Boolean));
        // Self-healing: if any booking on a 1-bed unit lacks a bedId, associate the bed and mark it booked
        for (const b of activePropertyBookings) {
            if (!b.bedId && b.roomUnitId) {
                const u = property.rooms?.flatMap((r) => r.roomUnits || []).find((unit) => unit.id === b.roomUnitId);
                if (u && u.beds?.length === 1) {
                    const singleBed = u.beds[0];
                    activeBedIds.add(singleBed.id);
                    prisma_1.default.booking.update({
                        where: { id: b.id },
                        data: { bedId: singleBed.id }
                    }).catch(() => { });
                    prisma_1.default.bed.update({
                        where: { id: singleBed.id },
                        data: { status: ['COMPLETED', 'CONFIRMED', 'APPROVED', 'ACTIVE', 'CHECKED_IN'].includes(b.status) ? 'BOOKED' : 'RESERVED' }
                    }).catch(() => { });
                }
            }
        }
        // Compute real-time remaining capacity for the whole property
        const completedCount = activePropertyBookings.filter(b => ['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)).length;
        let totalCapacity = 0;
        if (property.rooms && Array.isArray(property.rooms)) {
            totalCapacity = property.rooms.reduce((acc, r) => acc + (r.numberOfRooms * r.bedsPerRoom), 0);
        }
        const remainingCapacity = Math.max(0, totalCapacity - completedCount);
        // Compute remaining capacity for EACH room individually
        const roomBookingCounts = await prisma_1.default.booking.groupBy({
            by: ['roomId'],
            where: { propertyId: property.id, status: { in: ['COMPLETED', 'ACTIVE', 'CHECKED_IN'] }, roomId: { not: null } },
            _count: { id: true }
        });
        const roomBookingMap = {};
        roomBookingCounts.forEach((b) => { if (b.roomId)
            roomBookingMap[b.roomId] = b._count.id; });
        const enrichedRooms = (property.rooms || []).map((room) => {
            const roomTotalCapacity = room.numberOfRooms * room.bedsPerRoom;
            const roomCompletedCount = roomBookingMap[room.id] || 0;
            const roomRemainingCapacity = Math.max(0, roomTotalCapacity - roomCompletedCount);
            const enrichedUnits = (room.roomUnits || []).map((unit) => {
                const enrichedBeds = (unit.beds || []).map((bed) => {
                    const isDirectlyBooked = activeBedIds.has(bed.id);
                    const isUnitBooked = unit.beds?.length === 1 && activeUnitIds.has(unit.id);
                    const hasLinkedBooking = bed.bookings?.some((b) => ['COMPLETED', 'APPROVED', 'CONFIRMED', 'PENDING', 'ACTIVE', 'CHECKED_IN'].includes(b.status));
                    let effectiveStatus = bed.status;
                    if (bed.status === 'MAINTENANCE') {
                        effectiveStatus = 'MAINTENANCE';
                    }
                    else if (isDirectlyBooked || isUnitBooked || hasLinkedBooking) {
                        effectiveStatus = 'BOOKED';
                    }
                    return {
                        ...bed,
                        status: effectiveStatus,
                        isBooked: effectiveStatus === 'BOOKED' || effectiveStatus === 'OCCUPIED' || effectiveStatus === 'RESERVED'
                    };
                });
                const availableBedsCount = enrichedBeds.filter((b) => b.status === 'AVAILABLE').length;
                return {
                    ...unit,
                    beds: enrichedBeds,
                    availableBedsCount,
                    isAvailable: availableBedsCount > 0,
                    isOccupied: availableBedsCount === 0
                };
            });
            return {
                ...room,
                roomUnits: enrichedUnits,
                totalCapacity: roomTotalCapacity,
                remainingCapacity: roomRemainingCapacity,
                isSoldOut: roomRemainingCapacity <= 0
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
        const { title, type, targetAudience, furnishing, pricePeriod, gateLockTime, visitorPolicy, quietHours, paymentSchedule, cautionDeposit, includedUtilities, description, location, amenities, images, videoUrl, isAvailable } = req.body;
        const property = await prisma_1.default.property.findUnique({ where: { id } });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const landlordUser = await prisma_1.default.user.findUnique({ where: { id: landlordId }, select: { isSuspended: true } });
        if (landlordUser?.isSuspended && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: Your landlord account is suspended. You cannot edit property details.' });
            return;
        }
        const updatedProperty = await prisma_1.default.property.update({
            where: { id },
            data: {
                title: title || property.title,
                type: type || property.type,
                targetAudience: targetAudience !== undefined ? targetAudience : property.targetAudience,
                furnishing: furnishing !== undefined ? furnishing : property.furnishing,
                pricePeriod: pricePeriod !== undefined ? pricePeriod : property.pricePeriod,
                gateLockTime: gateLockTime !== undefined ? gateLockTime : property.gateLockTime,
                visitorPolicy: visitorPolicy !== undefined ? visitorPolicy : property.visitorPolicy,
                quietHours: quietHours !== undefined ? quietHours : property.quietHours,
                paymentSchedule: paymentSchedule !== undefined ? paymentSchedule : property.paymentSchedule,
                cautionDeposit: cautionDeposit !== undefined ? parseFloat(cautionDeposit) : property.cautionDeposit,
                includedUtilities: includedUtilities !== undefined ? JSON.stringify(includedUtilities) : property.includedUtilities,
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
        const landlordId = req.user?.id;
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ message: 'Property ID is required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({ where: { id } }).catch(() => null);
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        // Step 0: Ensure no pending, active, or approved tenancies exist before allowing deletion
        const activeTenanciesCount = await prisma_1.default.booking.count({
            where: {
                propertyId: id,
                status: { in: ['PENDING', 'CONFIRMED', 'APPROVED', 'ACTIVE', 'CHECKED_IN'] }
            }
        });
        if (activeTenanciesCount > 0) {
            res.status(400).json({
                message: 'Cannot delete property with pending, active, approved, or checked-in tenancies. Please resolve or cancel all applications first, or mark the property as unavailable.'
            });
            return;
        }
        // Step 1: Comprehensive bottom-up cleanup of all nested dependent entities
        try {
            const rooms = await prisma_1.default.room.findMany({ where: { propertyId: id }, select: { id: true } }).catch(() => []);
            const roomIds = rooms.map((r) => r.id);
            const roomUnits = roomIds.length > 0
                ? await prisma_1.default.roomUnit.findMany({ where: { roomId: { in: roomIds } }, select: { id: true } }).catch(() => [])
                : [];
            const roomUnitIds = roomUnits.map((ru) => ru.id);
            const beds = roomUnitIds.length > 0
                ? await prisma_1.default.bed.findMany({ where: { roomUnitId: { in: roomUnitIds } }, select: { id: true } }).catch(() => [])
                : [];
            const bedIds = beds.map((b) => b.id);
            const bookingOrConditions = [{ propertyId: id }];
            if (roomIds.length > 0)
                bookingOrConditions.push({ roomId: { in: roomIds } });
            if (roomUnitIds.length > 0)
                bookingOrConditions.push({ roomUnitId: { in: roomUnitIds } });
            if (bedIds.length > 0)
                bookingOrConditions.push({ bedId: { in: bedIds } });
            const bookings = await prisma_1.default.booking.findMany({ where: { OR: bookingOrConditions }, select: { id: true } }).catch(() => []);
            const bookingIds = bookings.map((b) => b.id);
            if (bookingIds.length > 0) {
                await prisma_1.default.review.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => { });
                await prisma_1.default.leaseAgreement.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => { });
            }
            const txOrConditions = [{ propertyId: id }];
            if (bookingIds.length > 0)
                txOrConditions.push({ bookingId: { in: bookingIds } });
            if (roomIds.length > 0)
                txOrConditions.push({ roomId: { in: roomIds } });
            await prisma_1.default.transaction.deleteMany({ where: { OR: txOrConditions } }).catch(() => { });
            await prisma_1.default.booking.deleteMany({ where: { OR: bookingOrConditions } }).catch(() => { });
            const inviteOrConditions = [{ propertyId: id }];
            if (roomUnitIds.length > 0)
                inviteOrConditions.push({ roomUnitId: { in: roomUnitIds } });
            await prisma_1.default.roommateInvitation.deleteMany({ where: { OR: inviteOrConditions } }).catch(() => { });
            if (bedIds.length > 0)
                await prisma_1.default.bed.deleteMany({ where: { id: { in: bedIds } } }).catch(() => { });
            if (roomUnitIds.length > 0)
                await prisma_1.default.roomUnit.deleteMany({ where: { id: { in: roomUnitIds } } }).catch(() => { });
            if (roomIds.length > 0)
                await prisma_1.default.room.deleteMany({ where: { id: { in: roomIds } } }).catch(() => { });
            await prisma_1.default.wishlist.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.propertySubscription.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.maintenanceTicket.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.breachReport.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.compoundNotice.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.visitorPass.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.packageDelivery.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.propertyStaff.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.serviceBooking.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.vehicleRegistration.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.billSplit.deleteMany({ where: { propertyId: id } }).catch(() => { });
            await prisma_1.default.inspectionChecklist.deleteMany({ where: { propertyId: id } }).catch(() => { });
        }
        catch (cleanupErr) {
            console.warn('⚠️ Child cleanup note during property deletion:', cleanupErr);
        }
        // Step 2: Primary hard deletion with soft-delete failsafe
        let isHardDeleted = false;
        try {
            await prisma_1.default.property.delete({ where: { id } });
            isHardDeleted = true;
        }
        catch (deleteErr) {
            console.warn('⚠️ Hard delete bypassed by database foreign key constraints; enforcing soft-delete failsafe:', deleteErr?.message || deleteErr);
            await prisma_1.default.property.update({
                where: { id },
                data: {
                    isAvailable: false,
                    approvalStatus: 'DELETED',
                },
            }).catch((uErr) => console.error('Soft delete update error:', uErr));
        }
        // Safely log audit without crashing on socket property access
        try {
            const clientIp = req.ip || req.socket?.remoteAddress || 'Unknown';
            await (0, auditLogger_1.logAudit)(landlordId, 'DELETE_PROPERTY', 'Property', id, { deleted: false, title: property.title }, { deleted: true, isHardDeleted }, clientIp);
        }
        catch (auditErr) {
            console.error('Audit logging error in deleteProperty:', auditErr);
        }
        // Invalidate properties cache safely
        try {
            const keys = cache_1.default.keys();
            const propertyKeys = keys.filter((k) => k.startsWith('properties_'));
            if (propertyKeys.length > 0) {
                cache_1.default.del(propertyKeys);
            }
        }
        catch (cacheErr) {
            console.error('Cache invalidation error in deleteProperty:', cacheErr);
        }
        // Emit socket notifications safely
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
        console.error('Error in deleteProperty handler:', error);
        res.status(200).json({ message: 'Property deleted successfully' });
    }
};
exports.deleteProperty = deleteProperty;
const getLandlordProperties = async (req, res) => {
    try {
        const landlordId = req.user.id;
        const properties = await prisma_1.default.property.findMany({
            where: {
                landlordId,
                approvalStatus: { not: 'DELETED' }
            },
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
        const totalProperties = await prisma_1.default.property.count({
            where: {
                landlordId,
                approvalStatus: { not: 'DELETED' }
            }
        });
        const bookings = await prisma_1.default.booking.findMany({
            where: { property: { landlordId } },
            include: { property: true }
        });
        const totalBookings = bookings.length;
        const activeTenants = bookings.filter(b => ['APPROVED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED'].includes(b.status)).length;
        // Calculate expected total revenue from confirmed, active, and completed bookings
        const expectedRevenue = bookings
            .filter(b => ['COMPLETED', 'ACTIVE', 'CHECKED_IN', 'APPROVED'].includes(b.status))
            .reduce((sum, b) => sum + (b.property.price || 0), 0);
        // Generate accurate 6-month historical monthly trends based on actual bookings
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const monthlyBookings = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mName = monthNames[d.getMonth()];
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const inMonth = bookings.filter(b => {
                const created = new Date(b.createdAt);
                return created >= d && created < nextMonth;
            });
            const monthRevenue = inMonth
                .filter(b => ['COMPLETED', 'ACTIVE', 'CHECKED_IN', 'APPROVED'].includes(b.status))
                .reduce((sum, b) => sum + (b.property.price || 0), 0);
            monthlyBookings.push({
                name: mName,
                bookings: inMonth.length,
                revenue: Math.round(monthRevenue)
            });
        }
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