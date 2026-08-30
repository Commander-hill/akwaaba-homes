"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStaff = exports.getPropertyStaff = exports.assignStaff = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Assign Staff (Caretaker/Porter/Manager) to a Property by Email
 */
const assignStaff = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId, email, role, canManageTickets, canCheckInTenants, canPostNotices } = req.body;
        if (!propertyId || !email) {
            res.status(400).json({ message: 'Property ID and staff email are required' });
            return;
        }
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        if (property.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: You do not own this property' });
            return;
        }
        const staffUser = await prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });
        if (!staffUser) {
            res.status(404).json({ message: `No user found with email ${email}. They must register on Akwaaba Homes first.` });
            return;
        }
        const assignment = await prisma_1.default.propertyStaff.upsert({
            where: {
                propertyId_userId: {
                    propertyId,
                    userId: staffUser.id
                }
            },
            update: {
                role: role || 'CARETAKER',
                canManageTickets: canManageTickets !== undefined ? canManageTickets : true,
                canCheckInTenants: canCheckInTenants !== undefined ? canCheckInTenants : true,
                canPostNotices: canPostNotices !== undefined ? canPostNotices : true
            },
            create: {
                propertyId,
                landlordId,
                userId: staffUser.id,
                role: role || 'CARETAKER',
                canManageTickets: canManageTickets !== undefined ? canManageTickets : true,
                canCheckInTenants: canCheckInTenants !== undefined ? canCheckInTenants : true,
                canPostNotices: canPostNotices !== undefined ? canPostNotices : true
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true }
                }
            }
        });
        res.status(200).json({ message: 'Staff member assigned successfully', assignment });
    }
    catch (error) {
        console.error('Error assigning staff:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.assignStaff = assignStaff;
/**
 * Get Staff assigned to Landlord's Properties
 */
const getPropertyStaff = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { propertyId } = req.query;
        const where = { landlordId };
        if (propertyId && typeof propertyId === 'string') {
            where.propertyId = propertyId;
        }
        const staff = await prisma_1.default.propertyStaff.findMany({
            where,
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true }
                },
                property: {
                    select: { id: true, title: true, location: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ staff });
    }
    catch (error) {
        console.error('Error fetching staff list:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPropertyStaff = getPropertyStaff;
/**
 * Remove Staff Assignment
 */
const removeStaff = async (req, res) => {
    try {
        const landlordId = req.user?.id;
        const { id } = req.params;
        const assignment = await prisma_1.default.propertyStaff.findUnique({
            where: { id }
        });
        if (!assignment) {
            res.status(404).json({ message: 'Staff assignment not found' });
            return;
        }
        if (assignment.landlordId !== landlordId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        await prisma_1.default.propertyStaff.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Staff assignment removed successfully' });
    }
    catch (error) {
        console.error('Error removing staff assignment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.removeStaff = removeStaff;
//# sourceMappingURL=staff.controller.js.map