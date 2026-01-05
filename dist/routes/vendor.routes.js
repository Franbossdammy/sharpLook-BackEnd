"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// vendor.routes.ts - CORRECTED WITH YOUR EXISTING UPLOAD MIDDLEWARE
const express_1 = require("express");
const vendor_controller_1 = __importDefault(require("../controllers/vendor.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const upload_1 = require("../middlewares/upload"); // Using your existing middleware
const types_1 = require("../types");
const vendor_validation_1 = require("../validations/vendor.validation");
const router = (0, express_1.Router)();
// All routes require authentication as vendor
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(types_1.UserRole.VENDOR));
/**
 * @route   GET /api/v1/vendors/profile
 * @desc    Get vendor profile
 * @access  Private (Vendor)
 */
router.get('/profile', vendor_controller_1.default.getProfile);
/**
 * @route   PUT /api/v1/vendors/profile
 * @desc    Update vendor profile
 * @access  Private (Vendor)
 */
router.put('/profile', (0, validate_1.validate)(vendor_validation_1.updateVendorProfileValidation), vendor_controller_1.default.updateProfile);
/**
 * @route   PUT /api/v1/vendors/availability
 * @desc    Update vendor availability schedule
 * @access  Private (Vendor)
 */
router.put('/availability', (0, validate_1.validate)(vendor_validation_1.updateAvailabilityValidation), vendor_controller_1.default.updateAvailability);
/**
 * @route   PUT /api/v1/vendors/location
 * @desc    Update vendor location
 * @access  Private (Vendor)
 */
router.put('/location', (0, validate_1.validate)(vendor_validation_1.updateLocationValidation), vendor_controller_1.default.updateLocation);
/**
 * @route   POST /api/v1/vendors/documents
 * @desc    Upload vendor document
 * @access  Private (Vendor)
 * @note    Uses uploadSingleDocument middleware - expects 'document' field in FormData
 */
router.post('/documents', upload_1.uploadSingleDocument, // This middleware handles .single('document')
vendor_controller_1.default.uploadDocument);
/**
 * @route   GET /api/v1/vendors/profile/completion
 * @desc    Check vendor profile completion status
 * @access  Private (Vendor)
 */
router.get('/profile/completion', vendor_controller_1.default.checkProfileCompletion);
exports.default = router;
//# sourceMappingURL=vendor.routes.js.map