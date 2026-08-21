import { Router } from 'express';
import multer from 'multer';
import { uploadAvatar, uploadVideo, uploadDocument, uploadPropertyImages } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Storage configuration
const storage = multer.memoryStorage();

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

// Routes
router.use(authenticate); // Protect all upload routes
router.post('/avatar', uploadAvatarConfig.single('avatar'), uploadAvatar);
router.post('/document', uploadDocumentConfig.single('document'), uploadDocument);
router.post('/video', uploadVideoConfig.single('video'), uploadVideo);
router.post('/images', uploadPropertyConfig.array('images', 5), uploadPropertyImages);

export default router;
