/// <reference types="multer" />
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export interface FileValidationOptions {
  /** Maximum file size in bytes. Default: 5MB */
  maxSizeBytes?: number;
  /** Allowed MIME types. Default: common image types */
  allowedMimeTypes?: string[];
}

const DEFAULT_MAX_SIZE   = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Validates uploaded file size and MIME type.
 * Works with @nestjs/platform-express Multer file objects.
 *
 * Usage:
 *   @UploadedFile(new FileValidationPipe({ maxSizeBytes: 2 * 1024 * 1024, allowedMimeTypes: ['image/jpeg'] }))
 *   file: Express.Multer.File
 *
 * For PDFs / documents:
 *   new FileValidationPipe({ allowedMimeTypes: ['application/pdf'] })
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly maxSizeBytes:    number;
  private readonly allowedMimeTypes: string[];

  constructor(options: FileValidationOptions = {}) {
    this.maxSizeBytes     = options.maxSizeBytes    ?? DEFAULT_MAX_SIZE;
    this.allowedMimeTypes = options.allowedMimeTypes ?? DEFAULT_MIME_TYPES;
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > this.maxSizeBytes) {
      const maxMb = (this.maxSizeBytes / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(`File size exceeds the ${maxMb}MB limit`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed. Accepted: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    return file;
  }
}
