// @ts-nocheck
import { Request, Response } from 'express';
import axios from 'axios';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';
import { verifySignedDocumentUrl } from '../utils/security.service';

dotenv.config(); // Ensure env is loaded even if imported early

// Explicitly configure cloudinary since import hoisting might load it before server.ts dotenv
if (process.env.CLOUDINARY_URL) {
  // Extract parts from the URL if needed, but cloudinary.config(true) usually forces a reload
  // Wait, let's just parse the URL manually to be 100% foolproof
  const url = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: url.username,
    api_secret: url.password,
    secure: true
  });
}

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

// Inspect binary header bytes to prevent polyglot / extension spoofing attacks
export const isValidFileType = (buffer: Buffer, type: 'image' | 'video' | 'any'): boolean => {
  if (!buffer || buffer.length < 4) return false;

  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  const isMp4 = buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  const isWebm = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;

  if (type === 'image') return isJpeg || isPng || isWebp || isGif;
  if (type === 'video') return isMp4 || isWebm;
  return isJpeg || isPng || isWebp || isGif || isPdf || isMp4 || isWebm;
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    if (!isValidFileType(req.file.buffer, 'image')) {
      res.status(400).json({ error: 'Invalid or corrupted image format. Magic bytes header check failed.' });
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

    if (!isValidFileType(req.file.buffer, 'video')) {
      res.status(400).json({ error: 'Invalid video format. Supported formats: MP4, WebM.' });
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

    if (!isValidFileType(req.file.buffer, 'any')) {
      res.status(400).json({ error: 'Invalid document format. Supported formats: PDF, PNG, JPEG, WebP.' });
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

    for (const file of files) {
      if (!isValidFileType(file.buffer, 'image')) {
        res.status(400).json({ error: `Invalid image detected in upload: ${file.originalname}. Only genuine JPEG, PNG, or WebP images are permitted.` });
        return;
      }
    }

    const user = req.user;
    const landlordIdSnippet = user?.id ? user.id.substring(0, 8).toUpperCase() : 'VERIFIED';
    const watermarkText = `Akwaaba Homes Verified - ID #${landlordIdSnippet}`;

    const watermarkSvg = `
      <svg width="1200" height="800">
        <style>
          .watermark-bg { fill: rgba(15, 23, 42, 0.45); rx: 10px; }
          .watermark-text { fill: rgba(255, 255, 255, 0.85); font-size: 19px; font-family: Arial, sans-serif; font-weight: 800; letter-spacing: 1px; }
        </style>
        <rect x="710" y="745" width="460" height="38" class="watermark-bg" />
        <text x="730" y="771" class="watermark-text">${watermarkText}</text>
      </svg>
    `;

    const urls: string[] = [];

    for (const file of files) {
      const processedBuffer = await sharp(file.buffer)
        .resize(1200, 800, { fit: 'cover' })
        .composite([
          {
            input: Buffer.from(watermarkSvg),
            top: 0,
            left: 0
          }
        ])
        .webp({ quality: 85 })
        .toBuffer();

      const url = await streamUpload(processedBuffer, 'properties', 'image');
      urls.push(url);
    }

    res.status(200).json({ urls });
  } catch (error: any) {
    console.error('Error uploading property images:', error);
    res.status(500).json({ error: `Internal server error during property images upload: ${error?.message || String(error)}` });
  }
};

export const serveSecureDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, expires, signature } = req.query;

    const verification = verifySignedDocumentUrl(
      String(url || ''),
      String(expires || ''),
      String(signature || '')
    );

    if (!verification.valid) {
      res.status(403).json({ error: verification.error || 'Access denied' });
      return;
    }

    const rawUrl = String(url);
    // Security check: Only allow streaming from verified Cloudinary assets
    if (!rawUrl.startsWith('https://res.cloudinary.com/')) {
      res.status(400).json({ error: 'Invalid document source' });
      return;
    }

    // Stream directly through backend so client never sees or stores raw Cloudinary bucket URL
    const documentResponse = await axios.get(rawUrl, {
      responseType: 'stream',
      timeout: 15000
    });

    res.setHeader('Content-Type', documentResponse.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    documentResponse.data.pipe(res);
  } catch (error) {
    console.error('Error serving secure document stream:', error);
    res.status(500).json({ error: 'Internal server error serving secure document' });
  }
};

export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No media file provided' });
      return;
    }

    const mime = req.file.mimetype;
    let folder = 'chat';
    let resourceType: 'image' | 'video' | 'auto' = 'auto';

    if (mime.startsWith('image/')) {
      folder = 'chat/images';
      resourceType = 'image';
    } else if (mime.startsWith('audio/')) {
      folder = 'chat/audio';
      resourceType = 'video'; // Cloudinary uses resource_type video for audio
    } else if (mime.includes('pdf') || mime.includes('document')) {
      folder = 'chat/documents';
      resourceType = 'auto';
    }

    const fileUrl = await streamUpload(req.file.buffer, folder, resourceType);
    res.status(200).json({ url: fileUrl, fileName: req.file.originalname, mimeType: mime });
  } catch (error: any) {
    console.error('Error uploading chat media:', error);
    res.status(500).json({ error: error?.message || 'Failed to upload chat media' });
  }
};

