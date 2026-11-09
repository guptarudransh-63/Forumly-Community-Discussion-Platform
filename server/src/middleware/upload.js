import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { config } from '../config/env.js';

let uploadMiddleware = null;

function getUploadMiddleware() {
  if (!uploadMiddleware) {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    const require = createRequire(import.meta.url);
    const multer = require('multer');

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, config.uploadDir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `media-${uniqueSuffix}${ext}`);
      },
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP images are supported.'));
      }
    };

    uploadMiddleware = multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter,
    });
  }
  return uploadMiddleware;
}

export const upload = {
  single: (fieldName) => (req, res, next) => {
    return getUploadMiddleware().single(fieldName)(req, res, next);
  },
  array: (fieldName, maxCount) => (req, res, next) => {
    return getUploadMiddleware().array(fieldName, maxCount)(req, res, next);
  },
};
