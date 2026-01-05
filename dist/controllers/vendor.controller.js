"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vendor_service_1 = __importDefault(require("../services/vendor.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const cloudinary_1 = require("../utils/cloudinary");
const errors_1 = require("../utils/errors");
const fs_1 = __importDefault(require("fs")); // ✅ ADD THIS LINE
class VendorController {
    constructor() {
        /**
         * Get vendor profile
         * GET /api/v1/vendors/profile
         */
        this.getProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const vendor = await vendor_service_1.default.getVendorProfile(userId);
            // Remove sensitive data
            const vendorResponse = vendor.toObject();
            delete vendorResponse.password;
            delete vendorResponse.refreshToken;
            return response_1.default.success(res, 'Vendor profile retrieved successfully', {
                vendor: vendorResponse,
            });
        });
        /**
         * Update vendor profile
         * PUT /api/v1/vendors/profile
         */
        this.updateProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const vendor = await vendor_service_1.default.updateVendorProfile(userId, req.body);
            // Remove sensitive data
            const vendorResponse = vendor.toObject();
            delete vendorResponse.password;
            delete vendorResponse.refreshToken;
            return response_1.default.success(res, 'Vendor profile updated successfully', {
                vendor: vendorResponse,
            });
        });
        /**
         * Update vendor availability schedule
         * PUT /api/v1/vendors/availability
         */
        this.updateAvailability = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { schedule } = req.body;
            const vendor = await vendor_service_1.default.updateAvailabilitySchedule(userId, schedule);
            // Remove sensitive data
            const vendorResponse = vendor.toObject();
            delete vendorResponse.password;
            delete vendorResponse.refreshToken;
            return response_1.default.success(res, 'Availability schedule updated successfully', {
                vendor: vendorResponse,
            });
        });
        /**
         * Update vendor location
         * PUT /api/v1/vendors/location
         */
        this.updateLocation = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { location, serviceRadius } = req.body;
            const vendor = await vendor_service_1.default.updateLocation(userId, location, serviceRadius);
            // Remove sensitive data
            const vendorResponse = vendor.toObject();
            delete vendorResponse.password;
            delete vendorResponse.refreshToken;
            return response_1.default.success(res, 'Vendor location updated successfully', {
                vendor: vendorResponse,
            });
        });
        /**
         * Upload vendor document
         * POST /api/v1/vendors/documents
         */
        this.uploadDocument = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { documentType } = req.body;
            console.log('📤 Upload request received');
            console.log('📁 req.file:', req.file);
            console.log('📋 req.body:', req.body);
            // ✅ Validate file exists
            if (!req.file) {
                throw new errors_1.BadRequestError('No document file uploaded');
            }
            // ✅ Validate document type
            const validTypes = [
                'idCard',
                'businessLicense',
                'certification',
            ];
            if (!validTypes.includes(documentType)) {
                throw new errors_1.BadRequestError('Invalid document type. Must be: idCard, businessLicense, or certification');
            }
            try {
                let documentUrl;
                // ✅ Handle buffer (if using memory storage) or file path (if using disk storage)
                if (req.file.buffer) {
                    // Using memory storage - upload buffer directly
                    console.log('✅ Uploading from buffer');
                    documentUrl = await (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, {
                        folder: 'vendor-documents',
                        resource_type: 'auto', // Handles images and PDFs
                    });
                }
                else if (req.file.path) {
                    // Using disk storage - read file first
                    console.log('✅ Uploading from file path:', req.file.path);
                    const fileBuffer = fs_1.default.readFileSync(req.file.path);
                    documentUrl = await (0, cloudinary_1.uploadToCloudinary)(fileBuffer, {
                        folder: 'vendor-documents',
                        resource_type: 'auto',
                    });
                    // Delete local file after upload
                    fs_1.default.unlinkSync(req.file.path);
                }
                else {
                    throw new errors_1.BadRequestError('Invalid file format');
                }
                console.log('✅ Document uploaded to Cloudinary:', documentUrl);
                // ✅ Save document URL to database
                const vendor = await vendor_service_1.default.uploadDocument(userId, documentType, documentUrl);
                // Remove sensitive data
                const vendorResponse = vendor.toObject();
                delete vendorResponse.password;
                delete vendorResponse.refreshToken;
                return response_1.default.success(res, 'Document uploaded successfully', {
                    vendor: vendorResponse,
                });
            }
            catch (error) {
                // Clean up local file if upload fails and file exists
                if (req.file.path && fs_1.default.existsSync(req.file.path)) {
                    fs_1.default.unlinkSync(req.file.path);
                }
                console.error('❌ Error uploading document:', error);
                throw new errors_1.BadRequestError(error.message || 'Failed to upload document. Please try again.');
            }
        });
        /**
         * Check vendor profile completion
         * GET /api/v1/vendors/profile/completion
         */
        this.checkProfileCompletion = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const completion = await vendor_service_1.default.checkProfileCompletion(userId);
            return response_1.default.success(res, 'Profile completion status retrieved', completion);
        });
    }
}
exports.default = new VendorController();
//# sourceMappingURL=vendor.controller.js.map