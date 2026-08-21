"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPropertyImages = exports.uploadDocument = exports.uploadVideo = exports.uploadAvatar = void 0;
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No image provided' });
            return;
        }
        // Process image with sharp
        const image = (0, sharp_1.default)(req.file.buffer);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) {
            res.status(400).json({ error: 'Invalid image format' });
            return;
        }
        // Rule 1: Minimum dimensions (e.g. 200x200)
        if (metadata.width < 200 || metadata.height < 200) {
            res.status(400).json({ error: 'Image too small. Minimum size is 200x200 pixels.' });
            return;
        }
        // Rule 2: Aspect Ratio Validation (1:1 or 3:4)
        const ratio = metadata.width / metadata.height;
        // Check if it's close to 1:1 (0.95 - 1.05) or close to 3:4 (0.72 - 0.78)
        const isSquare = ratio >= 0.95 && ratio <= 1.05;
        const isPassport = ratio >= 0.72 && ratio <= 0.78;
        if (!isSquare && !isPassport) {
            res.status(400).json({ error: 'Picture must be a square (1:1) or standard passport size (3:4 aspect ratio).' });
            return;
        }
        // Optional Rule: Max size checked by multer, but we will resize it for consistency
        // If it's a 3:4 ratio, we should probably resize it differently or just let sharp optimize it without hardcoding 600x600.
        // Let's use resize with 'inside' to just ensure it's not massive, but preserves its original ratio.
        const filename = `avatar-${(0, uuid_1.v4)()}.webp`;
        const outputPath = path_1.default.join(process.cwd(), 'public', 'uploads', 'avatars', filename);
        await image
            .resize(800, 800, { fit: 'inside' }) // Will scale down if larger than 800x800, maintaining aspect ratio
            .webp({ quality: 80 })
            .toFile(outputPath);
        // Return the URL
        const fileUrl = `/uploads/avatars/${filename}`;
        res.status(200).json({ url: fileUrl });
    }
    catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ error: 'Internal server error during upload' });
    }
};
exports.uploadAvatar = uploadAvatar;
const fs_1 = __importDefault(require("fs"));
const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No video provided' });
            return;
        }
        const extension = req.file.mimetype === 'video/webm' ? '.webm' : '.mp4';
        const filename = `video-${(0, uuid_1.v4)()}${extension}`;
        const outputPath = path_1.default.join(process.cwd(), 'public', 'uploads', 'videos', filename);
        // Save the raw buffer to disk
        fs_1.default.writeFileSync(outputPath, req.file.buffer);
        const fileUrl = `/uploads/videos/${filename}`;
        res.status(200).json({ url: fileUrl });
    }
    catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ error: 'Internal server error during upload' });
    }
};
exports.uploadVideo = uploadVideo;
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No document image provided' });
            return;
        }
        // Process image with sharp, just resize to ensure it isn't massive
        const image = (0, sharp_1.default)(req.file.buffer);
        const filename = `doc-${(0, uuid_1.v4)()}.webp`;
        const outputPath = path_1.default.join(process.cwd(), 'public', 'uploads', 'documents', filename);
        await image
            .resize(1200, 1200, { fit: 'inside' })
            .webp({ quality: 85 })
            .toFile(outputPath);
        const fileUrl = `/uploads/documents/${filename}`;
        res.status(200).json({ url: fileUrl });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Internal server error during document upload' });
    }
};
exports.uploadDocument = uploadDocument;
const uploadPropertyImages = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No images provided' });
            return;
        }
        const urls = [];
        for (const file of files) {
            const image = (0, sharp_1.default)(file.buffer);
            const filename = `property-${(0, uuid_1.v4)()}.webp`;
            const outputPath = path_1.default.join(process.cwd(), 'public', 'uploads', 'properties', filename);
            // Ensure directory exists (basic check, could use fs.mkdirSync)
            if (!fs_1.default.existsSync(path_1.default.dirname(outputPath))) {
                fs_1.default.mkdirSync(path_1.default.dirname(outputPath), { recursive: true });
            }
            await image
                .resize(1200, 800, { fit: 'cover' }) // Standardize property image size for gallery
                .webp({ quality: 85 })
                .toFile(outputPath);
            urls.push(`/uploads/properties/${filename}`);
        }
        res.status(200).json({ urls });
    }
    catch (error) {
        console.error('Error uploading property images:', error);
        res.status(500).json({ error: 'Internal server error during property images upload' });
    }
};
exports.uploadPropertyImages = uploadPropertyImages;
//# sourceMappingURL=upload.controller.js.map