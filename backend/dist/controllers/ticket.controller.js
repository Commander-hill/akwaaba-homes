"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = exports.getLandlordTickets = exports.getTenantTickets = exports.createTicket = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
const createTicket = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'TENANT') {
            res.status(403).json({ message: 'Only tenants can submit maintenance tickets' });
            return;
        }
        const { propertyId, title, description, priority, imageUrl } = req.body;
        if (!propertyId || !title || !description) {
            res.status(400).json({ message: 'Property ID, title, and description are required' });
            return;
        }
        // Verify tenant actually has an active booking at this property
        const activeBooking = await prisma_1.default.booking.findFirst({
            where: {
                tenantId: req.user.id,
                propertyId,
                status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] }
            }
        });
        if (!activeBooking) {
            res.status(403).json({ message: 'You can only report issues for properties you have booked' });
            return;
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
        if (!req.user || req.user.role !== 'TENANT') {
            res.status(403).json({ message: 'Access denied' });
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
        if (!req.user || req.user.role !== 'LANDLORD') {
            res.status(403).json({ message: 'Access denied' });
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
        if (!req.user || req.user.role !== 'LANDLORD') {
            res.status(403).json({ message: 'Only landlords can update ticket status' });
            return;
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        // Verify ownership
        const ticket = await prisma_1.default.maintenanceTicket.findUnique({
            where: { id },
            include: { property: true }
        });
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        if (ticket.property.landlordId !== req.user.id) {
            res.status(403).json({ message: 'You do not have permission to update this ticket' });
            return;
        }
        const updatedTicket = await prisma_1.default.maintenanceTicket.update({
            where: { id },
            data: { status }
        });
        // Notify tenant and landlord real-time sync
        try {
            const io = (0, socket_1.getIO)();
            io.to(ticket.tenantId).emit('notification', {
                title: `Ticket ${status}`,
                message: `Your maintenance ticket "${ticket.title}" is now ${status.toLowerCase()}.`,
                type: 'ticket'
            });
            io.to(ticket.tenantId).emit('ticket_updated', { ticket: updatedTicket });
            io.to(ticket.property.landlordId).emit('ticket_updated', { ticket: updatedTicket });
        }
        catch (e) {
            console.error('Socket emission failed', e);
        }
        res.status(200).json({ message: 'Ticket status updated', ticket: updatedTicket });
    }
    catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateTicketStatus = updateTicketStatus;
//# sourceMappingURL=ticket.controller.js.map