"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminEscalatedTickets = exports.checkAndEscalateTickets = exports.updateTicketStatus = exports.getLandlordTickets = exports.getTenantTickets = exports.createTicket = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
const createTicket = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const role = (req.user.role || '').toUpperCase();
        const { propertyId, title, description, priority, imageUrl } = req.body;
        if (!propertyId || !title || !description) {
            res.status(400).json({ message: 'Property ID, title, and description are required' });
            return;
        }
        // Verify user has a booking at this property (Admins bypass)
        if (role !== 'ADMIN') {
            const activeBooking = await prisma_1.default.booking.findFirst({
                where: {
                    tenantId: req.user.id,
                    propertyId,
                    status: { in: ['PENDING', 'APPROVED', 'COMPLETED', 'CONFIRMED'] }
                }
            });
            if (!activeBooking) {
                // Double-check if booking exists without status constraint
                const anyBooking = await prisma_1.default.booking.findFirst({
                    where: {
                        tenantId: req.user.id,
                        propertyId
                    }
                });
                if (!anyBooking && role !== 'TENANT') {
                    res.status(403).json({ message: 'Only tenants with a booked property can submit maintenance tickets' });
                    return;
                }
            }
        }
        const ticket = await prisma_1.default.maintenanceTicket.create({
            data: {
                tenantId: req.user.id,
                propertyId,
                title,
                description,
                priority: priority || 'MEDIUM',
                imageUrl
            }
        });
        // Notify landlord
        const property = await prisma_1.default.property.findUnique({ where: { id: propertyId } });
        if (property) {
            try {
                const io = (0, socket_1.getIO)();
                io.to(property.landlordId).emit('notification', {
                    title: 'New Maintenance Ticket',
                    message: `A new ${priority || 'MEDIUM'} priority ticket was submitted for ${property.title}.`,
                    type: 'ticket'
                });
                io.to(property.landlordId).emit('ticket_created', { ticket, propertyTitle: property.title });
                io.emit('ticket_created', { ticket, propertyTitle: property.title });
            }
            catch (e) {
                console.error('Socket emission failed', e);
            }
        }
        res.status(201).json({ message: 'Maintenance ticket submitted successfully', ticket });
    }
    catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createTicket = createTicket;
const getTenantTickets = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const tickets = await prisma_1.default.maintenanceTicket.findMany({
            where: { tenantId: req.user.id },
            include: {
                property: {
                    select: { title: true, location: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ tickets });
    }
    catch (error) {
        console.error('Error fetching tenant tickets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantTickets = getTenantTickets;
const getLandlordTickets = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const role = (req.user.role || '').toUpperCase();
        if (role !== 'LANDLORD' && role !== 'ADMIN') {
            res.status(403).json({ message: 'Access denied: Landlord access required' });
            return;
        }
        const tickets = await prisma_1.default.maintenanceTicket.findMany({
            where: {
                property: {
                    landlordId: req.user.id
                }
            },
            include: {
                property: {
                    select: { title: true, location: true }
                },
                tenant: {
                    select: { firstName: true, lastName: true, email: true, phoneNumber: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ tickets });
    }
    catch (error) {
        console.error('Error fetching landlord tickets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getLandlordTickets = getLandlordTickets;
const updateTicketStatus = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== 'LANDLORD' && req.user.role !== 'ADMIN')) {
            res.status(403).json({ message: 'Only landlords or admins can update ticket status' });
            return;
        }
        const { id } = req.params;
        const { status, scheduledDate, repairCost, completionImageUrl, resolutionNotes } = req.body;
        const validStatuses = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'];
        if (status && !validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        // Verify ownership
        const ticket = await prisma_1.default.maintenanceTicket.findUnique({
            where: { id },
            include: { property: true, tenant: true }
        });
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        if (req.user.role === 'LANDLORD' && ticket.property.landlordId !== req.user.id) {
            res.status(403).json({ message: 'You do not have permission to update this ticket' });
            return;
        }
        const updateData = {};
        if (status)
            updateData.status = status;
        if (scheduledDate)
            updateData.scheduledDate = new Date(scheduledDate);
        if (typeof repairCost === 'number')
            updateData.repairCost = repairCost;
        if (completionImageUrl)
            updateData.completionImageUrl = completionImageUrl;
        if (resolutionNotes)
            updateData.resolutionNotes = resolutionNotes;
        const updatedTicket = await prisma_1.default.maintenanceTicket.update({
            where: { id },
            data: updateData,
            include: {
                property: { select: { title: true, location: true } },
                tenant: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } }
            }
        });
        // Notify tenant and landlord real-time sync
        try {
            const io = (0, socket_1.getIO)();
            io.to(ticket.tenantId).emit('notification', {
                title: `Ticket ${status || 'Updated'}`,
                message: `Your maintenance ticket "${ticket.title}" is now ${status ? status.toLowerCase() : 'updated'}.`,
                type: 'ticket'
            });
            io.to(ticket.tenantId).emit('ticket_updated', { ticket: updatedTicket });
            io.to(ticket.property.landlordId).emit('ticket_updated', { ticket: updatedTicket });
            io.emit('ticket_updated', { ticket: updatedTicket });
        }
        catch (e) {
            console.error('Socket emission failed', e);
        }
        res.status(200).json({ message: 'Ticket updated successfully', ticket: updatedTicket });
    }
    catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateTicketStatus = updateTicketStatus;
/**
 * 48-Hour Urgency Escalation Guard:
 * Auto-escalates HIGH or URGENT priority tickets older than 48h to ADMIN.
 */
const checkAndEscalateTickets = async (req, res) => {
    try {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const overdueTickets = await prisma_1.default.maintenanceTicket.findMany({
            where: {
                priority: { in: ['HIGH', 'URGENT'] },
                status: { in: ['PENDING', 'SCHEDULED'] },
                isEscalated: false,
                createdAt: { lte: fortyEightHoursAgo }
            },
            include: { property: true }
        });
        if (overdueTickets.length > 0) {
            await prisma_1.default.maintenanceTicket.updateMany({
                where: { id: { in: overdueTickets.map(t => t.id) } },
                data: {
                    isEscalated: true,
                    status: 'ESCALATED',
                    escalatedAt: new Date()
                }
            });
            console.log(`⚠️  [Ticket Escalation Guard] Escalated ${overdueTickets.length} unresolved high-priority ticket(s) to Admin.`);
        }
        res.status(200).json({
            message: `Escalation check complete. ${overdueTickets.length} ticket(s) escalated.`,
            escalatedCount: overdueTickets.length
        });
    }
    catch (error) {
        console.error('Error checking overdue tickets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.checkAndEscalateTickets = checkAndEscalateTickets;
const getAdminEscalatedTickets = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Admin access required' });
            return;
        }
        const tickets = await prisma_1.default.maintenanceTicket.findMany({
            where: {
                OR: [
                    { isEscalated: true },
                    { priority: 'URGENT' },
                    { status: 'ESCALATED' }
                ]
            },
            include: {
                property: { select: { title: true, location: true, landlord: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } } } },
                tenant: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ tickets });
    }
    catch (error) {
        console.error('Error fetching admin escalated tickets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAdminEscalatedTickets = getAdminEscalatedTickets;
//# sourceMappingURL=ticket.controller.js.map