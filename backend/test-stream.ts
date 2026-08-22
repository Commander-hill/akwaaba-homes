import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import streamifier from 'streamifier';
import sharp from 'sharp';

dotenv.config();

if (process.env.CLOUDINARY_URL) {
  const url = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: url.username,
    api_secret: url.password,
    secure: true
  });
}

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

async function test() {
  try {
    // Generate a valid 10x10 transparent PNG buffer
    const buffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 }
      }
    }).png().toBuffer();
    
    console.log("Starting upload to Cloudinary...");
    const url = await streamUpload(buffer, 'test');
    console.log("Success!", url);
  } catch (err) {
    console.error("Cloudinary Error:", err);
  }
}

test();
