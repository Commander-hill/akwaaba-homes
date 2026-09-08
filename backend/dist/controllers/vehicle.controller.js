"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.getTenantVehicles = exports.getPropertyVehicles = exports.verifyVehiclePlate = exports.registerVehicle = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Register a resident or guest vehicle
 */
const registerVehicle = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const { propertyId, vehicleMake, vehicleModel, licensePlate, color, parkingSlotNumber, passType } = req.body;
        if (!propertyId || !vehicleMake || !vehicleModel || !licensePlate) {
            res.status(400).json({ message: 'Property ID, vehicle make, model, and license plate are required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (req.user?.role !== 'ADMIN') {
            const activeBooking = await prisma_1.default.booking.findFirst({
                where: {
                    tenantId,
                    propertyId,
                    status: { in: ['CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN', 'APPROVED'] }
                }
            });
            if (!activeBooking) {
                res.status(403).json({ message: 'Only residents with an active or confirmed booking can register vehicles for this property' });
                return;
            }
        }
        const vehicle = await prisma_1.default.vehicleRegistration.create({
            data: {
                tenantId,
                propertyId,
                vehicleMake: vehicleMake.trim(),
                vehicleModel: vehicleModel.trim(),
                licensePlate: licensePlate.trim().toUpperCase(),
                color: color || null,
                parkingSlotNumber: parkingSlotNumber || null,
                passType: passType || 'RESIDENT',
                status: 'ACTIVE'
            },
            include: {
                property: { select: { id: true, title: true, location: true } }
            }
        });
        res.status(201).json({
            message: 'Vehicle registered for security gate clearance',
            vehicle
        });
    }
    catch (error) {
        console.error('Error registering vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.registerVehicle = registerVehicle;
/**
 * Verify vehicle license plate at estate security gatehouse
 */
const verifyVehiclePlate = async (req, res) => {
    try {
        const { licensePlate } = req.query;
        if (!licensePlate) {
            res.status(400).json({ message: 'License plate query parameter is required' });
            return;
        }
        const cleanPlate = String(licensePlate).trim().toUpperCase();
        const vehicle = await prisma_1.default.vehicleRegistration.findFirst({
            where: {
                licensePlate: cleanPlate,
                status: 'ACTIVE'
            },
            include: {
                property: { select: { id: true, title: true, location: true } },
                tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } }
            }
        });
        if (!vehicle) {
            res.status(404).json({ message: `No active gate pass found for license plate: ${cleanPlate}`, authorized: false });
            return;
        }
        res.status(200).json({
            message: 'Vehicle Authorized for Security Gate Clearance ✅',
            authorized: true,
            vehicle
        });
    }
    catch (error) {
        console.error('Error verifying vehicle plate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.verifyVehiclePlate = verifyVehiclePlate;
/**
 * Get registered vehicles for a property (Landlord / Staff / Caretaker)
 */
const getPropertyVehicles = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;
        const userRole = (req.user?.role || '').toUpperCase();
        const property = await prisma_1.default.property.findUnique({ where: { id: propertyId } });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId, userId }
        });
        if (property.landlordId !== userId && userRole !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const vehicles = await prisma_1.default.vehicleRegistration.findMany({
            where: { propertyId, status: 'ACTIVE' },
            include: {
                tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ vehicles });
    }
    catch (error) {
        console.error('Error fetching property vehicles:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyVehicles = getPropertyVehicles;
/**
 * Get tenant's registered vehicles
 */
const getTenantVehicles = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const vehicles = await prisma_1.default.vehicleRegistration.findMany({
            where: { tenantId },
            include: {
                property: { select: { id: true, title: true, location: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ vehicles });
    }
    catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantVehicles = getTenantVehicles;
/**
 * Delete / Deregister a vehicle
 */
const deleteVehicle = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const { id } = req.params;
        const vehicle = await prisma_1.default.vehicleRegistration.findUnique({ where: { id } });
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle record not found' });
            return;
        }
        const isLandlord = await prisma_1.default.property.findFirst({
            where: { id: vehicle.propertyId, landlordId: tenantId }
        });
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: { propertyId: vehicle.propertyId, userId: tenantId }
        });
        if (vehicle.tenantId !== tenantId && req.user?.role !== 'ADMIN' && !isLandlord && !isStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to deregister this vehicle' });
            return;
        }
        await prisma_1.default.vehicleRegistration.delete({ where: { id } });
        res.status(200).json({ message: 'Vehicle deregistered successfully' });
    }
    catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteVehicle = deleteVehicle;
//# sourceMappingURL=vehicle.controller.js.map