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
                    status: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'] }
                }
            });
            if (!activeBooking) {
                res.status(403).json({ message: 'Only tenants with an active or confirmed booking at this property can submit maintenance tickets' });
                return;
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
        // Notify landlord and assigned maintenance staff
        const property = await prisma_1.default.property.findUnique({ where: { id: propertyId } });
        if (property) {
            try {
                const io = (0, socket_1.getIO)();
                await prisma_1.default.notification.create({
                    data: {
                        userId: property.landlordId,
                        type: 'ANNOUNCEMENT',
                        title: `🛠️ New ${priority || 'MEDIUM'} Maintenance Ticket`,
                        message: `Ticket "${title}" filed for ${property.title}.`,
                        link: '/dashboard/landlord'
                    }
                }).catch(() => null);
                io.to(property.landlordId).emit('notification', {
                    title: 'New Maintenance Ticket',
                    message: `A new ${priority || 'MEDIUM'} priority ticket was submitted for ${property.title}.`,
                    type: 'ticket'
                });
                io.to(property.landlordId).emit('ticket_created', { ticket, propertyTitle: property.title });
                const staffMembers = await prisma_1.default.propertyStaff.findMany({
                    where: { propertyId, canManageTickets: true },
                    select: { userId: true }
                });
                if (staffMembers.length > 0) {
                    await prisma_1.default.notification.createMany({
                        data: staffMembers.map(s => ({
                            userId: s.userId,
                            type: 'ANNOUNCEMENT',
                            title: `🛠️ New ${priority || 'MEDIUM'} Maintenance Ticket`,
                            message: `Ticket "${title}" filed for ${property.title}.`,
                            link: '/dashboard/caretaker'
                        }))
                    }).catch(() => null);
                    for (const s of staffMembers) {
                        io.to(s.userId).emit('notification', {
                            title: 'New Maintenance Ticket',
                            message: `A new ${priority || 'MEDIUM'} priority ticket was submitted for ${property.title}.`,
                            type: 'ticket'
                        });
                        io.to(s.userId).emit('ticket_created', { ticket, propertyTitle: property.title });
                    }
                }
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
        const staffAssignments = await prisma_1.default.propertyStaff.findMany({
            where: { userId: req.user.id },
            select: { propertyId: true }
        });
        const staffPropertyIds = staffAssignments.map(s => s.propertyId);
        const isStaff = staffPropertyIds.length > 0;
        if (role !== 'LANDLORD' && role !== 'ADMIN' && !isStaff) {
            res.status(403).json({ message: 'Access denied: Landlord or Caretaker access required' });
            return;
        }
        const tickets = await prisma_1.default.maintenanceTicket.findMany({
            where: {
                OR: [
                    { property: { landlordId: req.user.id } },
                    ...(staffPropertyIds.length > 0 ? [{ propertyId: { in: staffPropertyIds } }] : [])
                ]
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
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const { id } = req.params;
        const { status, scheduledDate, repairCost, completionImageUrl, resolutionNotes } = req.body;
        const validStatuses = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'];
        if (status && !validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        // Verify ownership or staff delegation
        const ticket = await prisma_1.default.maintenanceTicket.findUnique({
            where: { id },
            include: { property: true, tenant: true }
        });
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        const isStaff = await prisma_1.default.propertyStaff.findFirst({
            where: {
                propertyId: ticket.propertyId,
                userId: req.user.id,
                canManageTickets: true
            }
        });
        const isAuthorized = req.user.role === 'ADMIN' ||
            ticket.property.landlordId === req.user.id ||
            Boolean(isStaff);
        if (!isAuthorized) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to manage tickets for this property' });
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
            await prisma_1.default.notification.create({
                data: {
                    userId: ticket.tenantId,
                    type: 'ANNOUNCEMENT',
                    title: `🛠️ Maintenance Ticket ${status || 'Updated'}`,
                    message: `Your maintenance ticket "${ticket.title}" is now ${status ? status.toLowerCase() : 'updated'}.`,
                    link: '/dashboard/tenant'
                }
            }).catch(() => null);
            if (req.user.id !== ticket.property.landlordId) {
                await prisma_1.default.notification.create({
                    data: {
                        userId: ticket.property.landlordId,
                        type: 'ANNOUNCEMENT',
                        title: `🛠️ Ticket ${status || 'Updated'} by Staff`,
                        message: `Ticket "${ticket.title}" for ${ticket.property.title} was marked as ${status ? status.toLowerCase() : 'updated'}.`,
                        link: '/dashboard/landlord'
                    }
                }).catch(() => null);
            }
            io.to(ticket.tenantId).emit('notification', {
                title: `Ticket ${status || 'Updated'}`,
                message: `Your maintenance ticket "${ticket.title}" is now ${status ? status.toLowerCase() : 'updated'}.`,
                type: 'ticket'
            });
            io.to(ticket.tenantId).emit('ticket_updated', { ticket: updatedTicket });
            io.to(ticket.property.landlordId).emit('ticket_updated', { ticket: updatedTicket });
            const staffMembers = await prisma_1.default.propertyStaff.findMany({
                where: { propertyId: ticket.propertyId, canManageTickets: true },
                select: { userId: true }
            }).catch(() => []);
            for (const s of staffMembers) {
                io.to(s.userId).emit('ticket_updated', { ticket: updatedTicket });
            }
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
            // Dispatch real-time in-app notifications and socket alerts
            try {
                const io = (0, socket_1.getIO)();
                const admins = await prisma_1.default.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
                for (const t of overdueTickets) {
                    // Notify landlord
                    await prisma_1.default.notification.create({
                        data: {
                            userId: t.property.landlordId,
                            type: 'SYSTEM_ALERT',
                            title: `⚠️ Ticket Escalated: ${t.title}`,
                            message: `Ticket "${t.title}" (${t.priority} priority) exceeded 48h and was escalated to Admin resolution.`,
                            link: '/dashboard/landlord'
                        }
                    }).catch(() => null);
                    // Notify tenant
                    await prisma_1.default.notification.create({
                        data: {
                            userId: t.tenantId,
                            type: 'ANNOUNCEMENT',
                            title: `🛡️ Ticket Escalated to Support Admin`,
                            message: `Your high-priority ticket "${t.title}" was escalated to platform administrators for urgent resolution.`,
                            link: '/dashboard/tenant'
                        }
                    }).catch(() => null);
                    io.to(t.property.landlordId).emit('ticket_updated', { ticket: { ...t, status: 'ESCALATED', isEscalated: true } });
                    io.to(t.tenantId).emit('ticket_updated', { ticket: { ...t, status: 'ESCALATED', isEscalated: true } });
                }
                if (admins.length > 0) {
                    await prisma_1.default.notification.createMany({
                        data: admins.map(a => ({
                            userId: a.id,
                            type: 'SYSTEM_ALERT',
                            title: `⚠️ ${overdueTickets.length} High-Priority Ticket(s) Escalated`,
                            message: `${overdueTickets.length} maintenance ticket(s) older than 48 hours require urgent admin resolution.`,
                            link: '/admin/tickets'
                        }))
                    }).catch(() => null);
                    admins.forEach(a => {
                        io.to(a.id).emit('notification', {
                            title: 'Overdue Tickets Escalated',
                            message: `${overdueTickets.length} ticket(s) escalated to admin.`,
                            type: 'SYSTEM_ALERT'
                        });
                    });
                }
            }
            catch (e) {
                console.warn('Socket emission failed during escalation:', e);
            }
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