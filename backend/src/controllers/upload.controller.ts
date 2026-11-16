// @ts-nocheck
import { Request, Response } from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';
import { verifySignedDocumentUrl } from '../utils/security.service';
import { isOriginAllowed } from '../utils/cors';

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

// Resilient Multi-Tier Upload: Cloudinary -> Local Filesystem Fallback
const safeStreamUpload = async (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'auto' = 'auto',
  preferredExtension: string = 'webp'
): Promise<string> => {
  if (process.env.CLOUDINARY_URL) {
    try {
      return await streamUpload(buffer, folder, resourceType);
    } catch (cloudErr) {
      console.warn(`[SafeUpload] Cloudinary upload failed for folder "${folder}", seamlessly switching to local filesystem storage:`, cloudErr);
    }
  }

  // Graceful local disk fallback
  const uploadDir = path.resolve(process.cwd(), `public/uploads/${folder}`);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filename = `${folder.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${preferredExtension}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
};

// Inspect binary header bytes to prevent polyglot / extension spoofing attacks
export const isValidFileType = (buffer: Buffer, type: 'image' | 'video' | 'audio' | 'document' | 'any'): boolean => {
  if (!buffer || buffer.length < 4) return false;

  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  const isMp4 = buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  const isWebm = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;

  // Audio magic bytes: MP3 (ID3 tag or sync word), WAV (RIFF....WAVE), OGG (OggS), M4A/AAC
  const isMp3 = (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0);
  const isWav = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE';
  const isOgg = buffer.subarray(0, 4).toString('ascii') === 'OggS';
  const isAudio = isMp3 || isWav || isOgg || isMp4; // M4A shares ftyp header with mp4

  if (type === 'image') return isJpeg || isPng || isWebp || isGif;
  if (type === 'video') return isMp4 || isWebm;
  if (type === 'audio') return isAudio;
  if (type === 'document') return isPdf;
  return isJpeg || isPng || isWebp || isGif || isPdf || isMp4 || isWebm || isAudio;
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No image provided' });
      return;
    }

    if (!isValidFileType(req.file.buffer, 'image')) {
      res.status(400).json({ message: 'Invalid or corrupted image format. Only JPG, PNG, and WebP are allowed.' });
      return;
    }

    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      res.status(400).json({ message: 'Invalid image format' });
      return;
    }

    if (metadata.width < 100 || metadata.height < 100) {
      res.status(400).json({ message: 'Image too small. Minimum size is 100x100 pixels.' });
      return;
    }

    // Gracefully center-crop & resize any portrait or landscape photo to clean 800x800 square webp
    const processedBuffer = await image
      .resize(800, 800, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toBuffer();

    const fileUrl = await safeStreamUpload(processedBuffer, 'avatars', 'image', 'webp');

    res.status(200).json({ url: fileUrl, avatarUrl: fileUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Internal server error during upload' });
  }
};

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No video provided' });
      return;
    }

    if (!isValidFileType(req.file.buffer, 'video')) {
      res.status(400).json({ message: 'Invalid video format. Supported formats: MP4, WebM.' });
      return;
    }

    const ext = req.file.mimetype === 'video/webm' ? 'webm' : 'mp4';
    const fileUrl = await safeStreamUpload(req.file.buffer, 'videos', 'video', ext);
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ message: 'Internal server error during upload' });
  }
};

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No document image provided' });
      return;
    }

    if (!isValidFileType(req.file.buffer, 'any')) {
      res.status(400).json({ message: 'Invalid document format. Supported formats: PDF, PNG, JPEG, WebP.' });
      return;
    }

    const isPdf = req.file.buffer.length >= 4 && 
      req.file.buffer[0] === 0x25 && 
      req.file.buffer[1] === 0x50 && 
      req.file.buffer[2] === 0x44 && 
      req.file.buffer[3] === 0x46;

    let fileUrl: string;
    if (isPdf) {
      fileUrl = await safeStreamUpload(req.file.buffer, 'documents', 'auto', 'pdf');
    } else {
      const processedBuffer = await sharp(req.file.buffer)
        .resize(1200, 1200, { fit: 'inside' })
        .webp({ quality: 85 })
        .toBuffer();
      fileUrl = await safeStreamUpload(processedBuffer, 'documents', 'image', 'webp');
    }

    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Internal server error during document upload' });
  }
};

export const uploadPropertyImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No images provided' });
      return;
    }

    for (const file of files) {
      if (!isValidFileType(file.buffer, 'image')) {
        res.status(400).json({ message: `Invalid image detected in upload: ${file.originalname}. Only genuine JPEG, PNG, or WebP images are permitted.` });
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

      // Free original multer buffer from memory immediately
      (file as any).buffer = null;

      const url = await safeStreamUpload(processedBuffer, 'properties', 'image', 'webp');
      urls.push(url);
    }

    res.status(200).json({ urls });
  } catch (error: any) {
    console.error('Error uploading property images:', error);
    res.status(500).json({ message: 'Internal server error during property images upload' });
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
      res.status(403).json({ message: verification.error || 'Access denied' });
      return;
    }

    const rawUrl = String(url);

    // Support streaming from local uploads fallback safely
    if (rawUrl.startsWith('/uploads/')) {
      const sanitized = rawUrl.replace(/\.\./g, '');
      const localFilePath = path.resolve(process.cwd(), 'public', sanitized.replace(/^\//, ''));
      if (!fs.existsSync(localFilePath)) {
        res.status(404).json({ message: 'Document file not found' });
        return;
      }
      res.setHeader('Content-Type', sanitized.endsWith('.pdf') ? 'application/pdf' : 'image/webp');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      fs.createReadStream(localFilePath).pipe(res);
      return;
    }

    // Security check: Only allow streaming from verified Cloudinary assets
    if (!rawUrl.startsWith('https://res.cloudinary.com/')) {
      res.status(400).json({ message: 'Invalid document source' });
      return;
    }

    // Stream directly through backend so client never sees or stores raw Cloudinary bucket URL
    const documentResponse = await axios.get(rawUrl, {
      responseType: 'stream',
      timeout: 20000
    });

    res.setHeader('Content-Type', documentResponse.headers['content-type'] || 'application/octet-stream');
    if (documentResponse.headers['content-length']) {
      res.setHeader('Content-Length', documentResponse.headers['content-length']);
    }
    const reqOrigin = req.headers.origin;
    if (reqOrigin && isOriginAllowed(reqOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    documentResponse.data.on('error', (streamErr: any) => {
      console.error('Error during document streaming:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to stream document' });
      }
    });

    documentResponse.data.pipe(res);
  } catch (error) {
    console.error('Error serving secure document stream:', error);
    res.status(500).json({ message: 'Internal server error serving secure document' });
  }
};

export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No media file provided' });
      return;
    }

    const mime = req.file.mimetype;
    let folder = 'chat';
    let resourceType: 'image' | 'video' | 'auto' = 'auto';

    if (mime.startsWith('image/')) {
      if (!isValidFileType(req.file.buffer, 'image')) {
        res.status(400).json({ message: 'File content failed signature inspection. Not a valid image binary.' });
        return;
      }
      folder = 'chat/images';
      resourceType = 'image';
    } else if (mime.startsWith('audio/')) {
      if (!isValidFileType(req.file.buffer, 'audio')) {
        res.status(400).json({ message: 'File content failed signature inspection. Not a valid audio binary.' });
        return;
      }
      folder = 'chat/audio';
      resourceType = 'video'; // Cloudinary uses resource_type video for audio
    } else if (mime === 'application/pdf') {
      if (!isValidFileType(req.file.buffer, 'document')) {
        res.status(400).json({ message: 'File content failed signature inspection. Not a valid PDF document.' });
        return;
      }
      folder = 'chat/documents';
      resourceType = 'auto';
    } else {
      res.status(400).json({ message: 'Unsupported file format. Only images, audio files, and PDFs are permitted.' });
      return;
    }

    const ext = mime.startsWith('audio/') ? 'mp3' : mime === 'application/pdf' ? 'pdf' : 'webp';
    const fileUrl = await safeStreamUpload(req.file.buffer, folder, resourceType, ext);
    res.status(200).json({ url: fileUrl, fileName: req.file.originalname, mimeType: mime });
  } catch (error: any) {
    console.error('Error uploading chat media:', error);
    res.status(500).json({ message: 'Failed to upload chat media' });
  }
};

