"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMultipleFromCloudinary = exports.deleteFromCloudinary = exports.uploadMultipleToCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("./logger"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: config_1.default.cloudinary.cloudName,
    api_key: config_1.default.cloudinary.apiKey,
    api_secret: config_1.default.cloudinary.apiSecret,
});
/**
 * Upload buffer to Cloudinary
 */
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder: options.folder || 'sharplook',
            resource_type: options.resource_type || 'image', // ← UPDATED: Use provided resource_type
            transformation: options.transformation,
            public_id: options.public_id,
        }, (error, result) => {
            if (error) {
                logger_1.default.error('Cloudinary upload error:', error);
                reject(error);
            }
            else {
                resolve(result.secure_url);
            }
        });
        const readable = stream_1.Readable.from(buffer);
        readable.pipe(uploadStream);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
/**
 * Upload multiple buffers to Cloudinary
 */
const uploadMultipleToCloudinary = async (buffers, options = {}) => {
    const uploadPromises = buffers.map((buffer) => (0, exports.uploadToCloudinary)(buffer, options));
    return Promise.all(uploadPromises);
};
exports.uploadMultipleToCloudinary = uploadMultipleToCloudinary;
/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (imageUrl) => {
    try {
        // Extract public_id from URL
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1];
        const publicId = filename.split('.')[0];
        const folder = parts[parts.length - 2];
        const fullPublicId = `${folder}/${publicId}`;
        await cloudinary_1.v2.uploader.destroy(fullPublicId);
        logger_1.default.info(`Deleted image from Cloudinary: ${fullPublicId}`);
    }
    catch (error) {
        logger_1.default.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
/**
 * Delete multiple images from Cloudinary
 */
const deleteMultipleFromCloudinary = async (imageUrls) => {
    const deletePromises = imageUrls.map((url) => (0, exports.deleteFromCloudinary)(url));
    await Promise.all(deletePromises);
};
exports.deleteMultipleFromCloudinary = deleteMultipleFromCloudinary;
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.js.map