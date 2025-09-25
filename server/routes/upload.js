import multer from 'multer';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { scanZipFile } from '../controllers/uploadScan.js';
import auth from '../authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Ensure uploads directory exists
fs.mkdirSync('uploads', { recursive: true });

const maxFileMb = parseInt(process.env.UPLOAD_MAX_FILE_MB || '20', 10);
const allowedExtsEnv = process.env.UPLOAD_ALLOWED_EXTS || '';
const defaultAllowed = [
  '.json', '.lock', '.txt', '.yaml', '.yml', '.xml', '.toml',
  '.gradle', '.mod', '.sum', '.properties', '.ini', '.conf',
  '.pom', '.csproj', '.vbproj', '.groovy', '.ts', '.js'
];
const allowedExts = (allowedExtsEnv ? allowedExtsEnv.split(',') : defaultAllowed)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: maxFileMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext) return cb(new Error('Extension de fichier requise'));
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Type de fichier non autorisé'));
    }
    cb(null, true);
  },
});

// Per-user limiter for uploads
const uploadLimit = parseInt(process.env.UPLOAD_RATE_MAX || '10', 10);
const uploadWindowMin = parseInt(process.env.UPLOAD_RATE_WINDOW_MIN || '10', 10);
const uploadLimiter = rateLimit({
  windowMs: uploadWindowMin * 60 * 1000,
  limit: uploadLimit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?.username ? `u:${req.user.username}` : `ip:${req.ip}`),
});

router.post('/upload', auth, uploadLimiter, upload.single('file'), scanZipFile);
export default router;
