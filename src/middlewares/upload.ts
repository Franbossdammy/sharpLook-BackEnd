import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';

// Configure memory storage
const storage = multer.memoryStorage();

// File filter for images only
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// File filter for documents
const documentFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only PDF, DOC, DOCX, and image files are allowed'));
  }
};

// Single image upload (for avatars, profile images)
export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
}).single('image');

// Multiple images upload (for service images, galleries)
export const uploadMultipleImages = (maxCount: number = 5) =>
  multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB per file
    },
    fileFilter: imageFileFilter,
  }).array('images', maxCount);

// Single document upload (for verification documents)
export const uploadSingleDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: documentFileFilter,
}).single('document');

// Multiple documents upload
export const uploadMultipleDocuments = (maxCount: number = 3) =>
  multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
    },
    fileFilter: documentFileFilter,
  }).array('documents', maxCount);

// Mixed upload - for forms with both avatar and other files
export const uploadMixedFiles = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'images', maxCount: 5 },
]);

// Profile files upload - FIXED VERSION
const profileFilesUploader = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// Wrap it in a middleware function
export const uploadProfileFiles = (req: Request, res: Response, next: NextFunction) => {
  profileFilesUploader(req, res, next);
};