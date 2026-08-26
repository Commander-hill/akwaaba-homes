import { Router } from 'express';
import multer from 'multer';
import { uploadAvatar, uploadVideo, uploadDocument, uploadPropertyImages, serveSecureDocument, uploadMedia } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Storage configuration
const storage = multer.memoryStorage();

// General media upload (images, audio, PDF up to 25MB)
const uploadMediaConfig = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Avatar upload (images up to 2MB)
const uploadAvatarConfig = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Document upload (images up to 5MB)
const uploadDocumentConfig = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for documents!'));
    }
  },
});

// Property images upload (up to 5MB each)
const uploadPropertyConfig = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Video upload (videos up to 50MB)
const uploadVideoConfig = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 and WebM video files are allowed!'));
    }
  },
});

// Public signed-document proxy route (validated via HMAC signature & 15-min expiration timestamp)
router.get('/secure-document', serveSecureDocument);
// Public avatar upload (for user registration flow)
router.post('/avatar', uploadAvatarConfig.single('avatar'), uploadAvatar);

// Protected upload routes
router.use(authenticate);
router.post('/document', uploadDocumentConfig.single('document'), uploadDocument);
router.post('/video', uploadVideoConfig.single('video'), uploadVideo);
router.post('/images', uploadPropertyConfig.array('images', 5), uploadPropertyImages);
router.post('/media', uploadMediaConfig.single('file'), uploadMedia);

export default router;
