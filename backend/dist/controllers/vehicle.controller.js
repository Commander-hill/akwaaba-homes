"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.getTenantVehicles = exports.registerVehicle = void 0;
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
        if (vehicle.tenantId !== tenantId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
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