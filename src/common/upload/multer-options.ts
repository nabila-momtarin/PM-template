import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const createMulterOptions = (folder: 'tasks' | 'tickets'): MulterOptions => ({
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = join(process.cwd(), 'uploads', folder);

      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },

    filename: (_req, file, cb) => {
      const fileExt = extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

      cb(null, uniqueName);
    },
  }),

  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException('Only jpg, png, webp and pdf files are allowed'),
        false,
      );
    }

    cb(null, true);
  },

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 5,
  },
});