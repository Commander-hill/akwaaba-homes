"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGatePass = exports.revokeVisitorPass = exports.getTenantVisitorPasses = exports.createVisitorPass = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_1 = require("../socket");
/**
 * Generate a 1-Time Digital Visitor Gate Pass
 */
const createVisitorPass = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const { propertyId, visitorName, visitorPhone, purpose, durationHours } = req.body;
        if (!propertyId || !visitorName) {
            res.status(400).json({ message: 'Property ID and visitor name are required' });
            return;
        }
        // Verify property exists
        const property = await prisma_1.default.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            res.status(404).json({ message: 'Property not found' });
            return;
        }
        // Generate a secure 6-digit access PIN
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        const validFrom = new Date();
        const hours = parseInt(durationHours || '12', 10);
        const validUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
        const pass = await prisma_1.default.visitorPass.create({
            data: {
                tenantId,
                propertyId,
                visitorName,
                visitorPhone: visitorPhone || null,
                purpose: purpose || 'Guest Visit',
                accessCode,
                validFrom,
                validUntil,
                status: 'ACTIVE'
            },
            include: {
                property: { select: { id: true, title: true, location: true } }
            }
        });
        try {
            (0, socket_1.getIO)().to(tenantId).emit('visitor_pass_created', pass);
        }
        catch (e) { /* non-blocking */ }
        res.status(201).json({
            message: 'Visitor gate pass generated successfully',
            pass
        });
    }
    catch (error) {
        console.error('Error generating visitor pass:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createVisitorPass = createVisitorPass;
/**
 * Get tenant's visitor passes
 */
const getTenantVisitorPasses = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const passes = await prisma_1.default.visitorPass.findMany({
            where: { tenantId },
            include: {
                property: { select: { id: true, title: true, location: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ passes });
    }
    catch (error) {
        console.error('Error fetching visitor passes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTenantVisitorPasses = getTenantVisitorPasses;
/**
 * Revoke a visitor pass
 */
const revokeVisitorPass = async (req, res) => {
    try {
        const tenantId = req.user?.id;
        const { id } = req.params;
        const pass = await prisma_1.default.visitorPass.findUnique({ where: { id } });
        if (!pass) {
            res.status(404).json({ message: 'Pass not found' });
            return;
        }
        if (pass.tenantId !== tenantId && req.user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const updated = await prisma_1.default.visitorPass.update({
            where: { id },
            data: { status: 'REVOKED' }
        });
        res.status(200).json({ message: 'Visitor pass revoked', pass: updated });
    }
    catch (error) {
        console.error('Error revoking visitor pass:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.revokeVisitorPass = revokeVisitorPass;
/**
 * Verify Gate Pass (Security Guard / Porter endpoint)
 */
const verifyGatePass = async (req, res) => {
    try {
        const { accessCode } = req.body;
        if (!accessCode) {
            res.status(400).json({ message: 'Access code is required' });
            return;
        }
        const pass = await prisma_1.default.visitorPass.findFirst({
            where: { accessCode: accessCode.trim() },
            include: {
                tenant: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
                property: { select: { id: true, title: true, location: true } }
            }
        });
        if (!pass) {
            res.status(404).json({ message: 'Invalid or unrecognized access PIN', valid: false });
            return;
        }
        const now = new Date();
        if (pass.status === 'REVOKED') {
            res.status(400).json({ message: 'This pass has been REVOKED by the resident', valid: false, pass });
            return;
        }
        if (now > new Date(pass.validUntil)) {
            res.status(400).json({ message: 'This pass has EXPIRED', valid: false, pass });
            return;
        }
        // Mark check in
        const updated = await prisma_1.default.visitorPass.update({
            where: { id: pass.id },
            data: {
                status: 'USED',
                checkInTime: pass.checkInTime || now
            }
        });
        try {
            (0, socket_1.getIO)().to(pass.tenantId).emit('visitor_checked_in', {
                passId: pass.id,
                visitorName: pass.visitorName,
                checkInTime: now
            });
        }
        catch (e) { /* non-blocking */ }
        res.status(200).json({
            message: 'Gate Pass Verified & Cleared for Entry ✅',
            valid: true,
            pass: { ...pass, ...updated }
        });
    }
    catch (error) {
        console.error('Error verifying gate pass:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.verifyGatePass = verifyGatePass;
//# sourceMappingURL=visitorPass.controller.js.map