"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const upload_controller_1 = require("../controllers/upload.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Storage configuration
const storage = multer_1.default.memoryStorage();
// Avatar upload (images up to 2MB)
const uploadAvatarConfig = (0, multer_1.default)({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});
// Document upload (images up to 5MB)
const uploadDocumentConfig = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed for documents!'));
        }
    },
});
// Property images upload (up to 5MB each)
const uploadPropertyConfig = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});
// Video upload (videos up to 50MB)
const uploadVideoConfig = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'video/mp4' || file.mimetype === 'video/webm') {
            cb(null, true);
        }
        else {
            cb(new Error('Only MP4 and WebM video files are allowed!'));
        }
    },
});
// Public signed-document proxy route (validated via HMAC signature & 15-min expiration timestamp)
router.get('/secure-document', upload_controller_1.serveSecureDocument);
// Public avatar upload (for user registration flow)
router.post('/avatar', uploadAvatarConfig.single('avatar'), upload_controller_1.uploadAvatar);
// Protected upload routes
router.use(auth_middleware_1.authenticate);
router.post('/document', uploadDocumentConfig.single('document'), upload_controller_1.uploadDocument);
router.post('/video', uploadVideoConfig.single('video'), upload_controller_1.uploadVideo);
router.post('/images', uploadPropertyConfig.array('images', 5), upload_controller_1.uploadPropertyImages);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map