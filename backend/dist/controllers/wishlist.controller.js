"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyWishlist = exports.toggleWishlist = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Toggle property in user wishlist (Add if not present, remove if present)
 */
const toggleWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { propertyId } = req.body;
        if (!propertyId) {
            res.status(400).json({ message: 'propertyId is required' });
            return;
        }
        const existing = await prisma_1.default.wishlist.findUnique({
            where: {
                userId_propertyId: { userId, propertyId }
            }
        });
        if (existing) {
            await prisma_1.default.wishlist.delete({
                where: { id: existing.id }
            });
            res.status(200).json({ message: 'Property removed from wishlist', isSaved: false });
            return;
        }
        await prisma_1.default.wishlist.create({
            data: { userId, propertyId }
        });
        res.status(201).json({ message: 'Property saved to wishlist', isSaved: true });
    }
    catch (error) {
        console.error('Error toggling wishlist:', error);
        res.status(500).json({ message: 'Failed to update wishlist' });
    }
};
exports.toggleWishlist = toggleWishlist;
/**
 * Get all wishlisted properties for current user
 */
const getMyWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const wishlists = await prisma_1.default.wishlist.findMany({
            where: { userId },
            include: {
                property: {
                    include: {
                        rooms: { select: { price: true, roomType: true } },
                        landlord: { select: { firstName: true, lastName: true, isVerifiedLandlord: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const properties = wishlists.map(w => w.property);
        const savedPropertyIds = wishlists.map(w => w.propertyId);
        res.status(200).json({ wishlists, properties, savedPropertyIds });
    }
    catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
};
exports.getMyWishlist = getMyWishlist;
//# sourceMappingURL=wishlist.controller.js.map