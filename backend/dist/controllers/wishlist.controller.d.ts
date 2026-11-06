import { Request, Response } from 'express';
/**
 * Toggle property in user wishlist (Add if not present, remove if present)
 * Also supports batch importing an array of guest-saved propertyIds (`{ propertyIds: string[] }`)
 */
export declare const toggleWishlist: (req: Request, res: Response) => Promise<void>;
/**
 * Get all wishlisted properties for current user
 */
export declare const getMyWishlist: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=wishlist.controller.d.ts.map