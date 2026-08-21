// @ts-nocheck
import { Request, Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    // Process image with sharp
    const image = sharp(req.file.buffer);
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
    const filename = `avatar-${uuidv4()}.webp`;
    const outputPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', filename);

    await image
      .resize(800, 800, { fit: 'inside' }) // Will scale down if larger than 800x800, maintaining aspect ratio
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Return the URL
    const fileUrl = `/uploads/avatars/${filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
};

import fs from 'fs';

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No video provided' });
      return;
    }

    const extension = req.file.mimetype === 'video/webm' ? '.webm' : '.mp4';
    const filename = `video-${uuidv4()}${extension}`;
    const outputPath = path.join(process.cwd(), 'public', 'uploads', 'videos', filename);

    // Save the raw buffer to disk
    fs.writeFileSync(outputPath, req.file.buffer);

    const fileUrl = `/uploads/videos/${filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
};

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No document image provided' });
      return;
    }

    // Process image with sharp, just resize to ensure it isn't massive
    const image = sharp(req.file.buffer);
    const filename = `doc-${uuidv4()}.webp`;
    const outputPath = path.join(process.cwd(), 'public', 'uploads', 'documents', filename);

    await image
      .resize(1200, 1200, { fit: 'inside' })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const fileUrl = `/uploads/documents/${filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Internal server error during document upload' });
  }
};

export const uploadPropertyImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No images provided' });
      return;
    }

    const urls: string[] = [];

    for (const file of files) {
      const image = sharp(file.buffer);
      const filename = `property-${uuidv4()}.webp`;
      const outputPath = path.join(process.cwd(), 'public', 'uploads', 'properties', filename);

      // Ensure directory exists (basic check, could use fs.mkdirSync)
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }

      await image
        .resize(1200, 800, { fit: 'cover' }) // Standardize property image size for gallery
        .webp({ quality: 85 })
        .toFile(outputPath);

      urls.push(`/uploads/properties/${filename}`);
    }

    res.status(200).json({ urls });
  } catch (error) {
    console.error('Error uploading property images:', error);
    res.status(500).json({ error: 'Internal server error during property images upload' });
  }
};
