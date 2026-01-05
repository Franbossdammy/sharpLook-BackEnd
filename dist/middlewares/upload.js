"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProfileFiles = exports.uploadMixedFiles = exports.uploadMultipleDocuments = exports.uploadSingleDocument = exports.uploadMultipleImages = exports.uploadSingleImage = void 0;
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("../utils/errors");
// Configure memory storage
const storage = multer_1.default.memoryStorage();
// File filter for images only
const imageFileFilter = (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new errors_1.BadRequestError('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
};
// File filter for documents
const documentFileFilter = (_req, file, cb) => {
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
    }
    else {
        cb(new errors_1.BadRequestError('Only PDF, DOC, DOCX, and image files are allowed'));
    }
};
// Single image upload (for avatars, profile images)
exports.uploadSingleImage = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: imageFileFilter,
}).single('image');
// Multiple images upload (for service images, galleries)
const uploadMultipleImages = (maxCount = 5) => (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
    },
    fileFilter: imageFileFilter,
}).array('images', maxCount);
exports.uploadMultipleImages = uploadMultipleImages;
// Single document upload (for verification documents)
exports.uploadSingleDocument = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: documentFileFilter,
}).single('document');
// Multiple documents upload
const uploadMultipleDocuments = (maxCount = 3) => (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
    },
    fileFilter: documentFileFilter,
}).array('documents', maxCount);
exports.uploadMultipleDocuments = uploadMultipleDocuments;
// Mixed upload - for forms with both avatar and other files
exports.uploadMixedFiles = (0, multer_1.default)({
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
const profileFilesUploader = (0, multer_1.default)({
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
const uploadProfileFiles = (req, res, next) => {
    profileFilesUploader(req, res, next);
};
exports.uploadProfileFiles = uploadProfileFiles;
//# sourceMappingURL=upload.js.map