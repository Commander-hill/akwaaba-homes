// @ts-nocheck
import { Request, Response } from 'express';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Helper function to upload a buffer to Cloudinary
const streamUpload = (buffer: Buffer, folder: string, resourceType: 'image' | 'video' | 'auto' = 'auto'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `akwaaba/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      res.status(400).json({ error: 'Invalid image format' });
      return;
    }

    if (metadata.width < 200 || metadata.height < 200) {
      res.status(400).json({ error: 'Image too small. Minimum size is 200x200 pixels.' });
      return;
    }

    const ratio = metadata.width / metadata.height;
    const isSquare = ratio >= 0.95 && ratio <= 1.05;
    const isPassport = ratio >= 0.72 && ratio <= 0.78;

    if (!isSquare && !isPassport) {
      res.status(400).json({ error: 'Picture must be a square (1:1) or standard passport size (3:4 aspect ratio).' });
      return;
    }

    const processedBuffer = await image
      .resize(800, 800, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    const fileUrl = await streamUpload(processedBuffer, 'avatars', 'image');
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
};

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No video provided' });
      return;
    }

    const fileUrl = await streamUpload(req.file.buffer, 'videos', 'video');
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

    const processedBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();

    const fileUrl = await streamUpload(processedBuffer, 'documents', 'image');
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
      const processedBuffer = await sharp(file.buffer)
        .resize(1200, 800, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();

      const url = await streamUpload(processedBuffer, 'properties', 'image');
      urls.push(url);
    }

    res.status(200).json({ urls });
  } catch (error) {
    console.error('Error uploading property images:', error);
    res.status(500).json({ error: 'Internal server error during property images upload' });
  }
};
