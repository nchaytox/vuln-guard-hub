import multer from 'multer';
import express from 'express';
import fs from 'fs';
import { scanZipFile } from '../controllers/uploadScan.js';
import auth from '../authMiddleware.js';

const router = express.Router();

// Ensure uploads directory exists
fs.mkdirSync('uploads', { recursive: true });

const upload = multer({ dest: 'uploads/' });

router.post('/upload', auth, upload.single('file'), scanZipFile);
export default router;
