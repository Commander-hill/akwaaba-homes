import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

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

async function test() {
  try {
    const result = await cloudinary.uploader.upload('https://via.placeholder.com/150', { folder: 'test' });
    console.log("Success!", result.secure_url);
  } catch (err) {
    console.error("Cloudinary Error:", err);
  }
}

test();
