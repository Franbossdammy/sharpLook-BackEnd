"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMessageAttachment = void 0;
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("../utils/errors");
// Configure memory storage
const storage = multer_1.default.memoryStorage();
// File filter for message attachments (images, videos, audio, documents)
const messageFileFilter = (_req, file, cb) => {
    // Log the received file details for debugging
    console.log('📁 Multer received file:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
    });
    const allowedMimes = [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        // Videos
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        // Audio - all possible formats from mobile recordings
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/webm',
        'audio/mp4',
        'audio/x-m4a',
        'audio/m4a',
        'audio/aac',
        'audio/3gpp',
        'audio/amr',
        'audio/mp4a-latm',
        'audio/mpeg3',
        'audio/x-mpeg-3',
        // React Native sometimes sends m4a with wrong mime type prefix
        'image/m4a', // ⭐ Workaround for React Native FormData bug
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Fallback for unknown types
        'application/octet-stream',
    ];
    // Check if mimetype is allowed
    if (allowedMimes.includes(file.mimetype)) {
        console.log('✅ File type accepted:', file.mimetype);
        cb(null, true);
        return;
    }
    // If mimetype is octet-stream, check file extension as fallback
    if (file.mimetype === 'application/octet-stream') {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['m4a', 'mp4', 'mp3', 'wav', 'ogg', 'aac', '3gp', 'amr'];
        if (ext && allowedExtensions.includes(ext)) {
            console.log('✅ File accepted by extension:', ext);
            cb(null, true);
            return;
        }
    }
    // Reject if not allowed
    console.error('❌ File type rejected:', file.mimetype);
    cb(new errors_1.BadRequestError(`File type not supported: ${file.mimetype}. Please upload images, videos, audio files, or documents.`));
};
// Message attachment upload (single file)
exports.uploadMessageAttachment = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB for videos
    },
    fileFilter: messageFileFilter,
}).single('file');
//# sourceMappingURL=message.upload.middleware.js.map