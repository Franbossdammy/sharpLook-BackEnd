"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
const User_1 = __importDefault(require("../models/User"));
const email_service_1 = __importDefault(require("./email.service"));
const referral_service_1 = __importDefault(require("./referral.service"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
class AuthService {
    /**
     * Generate JWT access token
     */
    generateAccessToken(user) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.secret, {
            expiresIn: config_1.default.jwt.expiresIn,
        });
    }
    /**
     * Generate JWT refresh token
     */
    generateRefreshToken(user) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.refreshSecret, {
            expiresIn: config_1.default.jwt.refreshExpiresIn,
        });
    }
    /**
     * Generate both tokens
     */
    async generateTokens(user) {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);
        // Save refresh token to database
        user.refreshToken = refreshToken;
        await user.save();
        return { accessToken, refreshToken };
    }
    /**
     * Register a new user
     */
    async register(userData) {
        // 1️⃣ Check if user already exists
        const existingUser = await User_1.default.findOne({
            $or: [{ email: userData.email }, { phone: userData.phone }],
        });
        if (existingUser) {
            if (existingUser.email === userData.email) {
                throw new errors_1.ConflictError('Email already registered');
            }
            throw new errors_1.ConflictError('Phone number already registered');
        }
        // 2️⃣ Generate unique referral code
        let referralCode = (0, helpers_1.generateReferralCode)();
        let isUnique = false;
        while (!isUnique) {
            const existingCode = await User_1.default.findOne({ referralCode });
            if (!existingCode) {
                isUnique = true;
            }
            else {
                referralCode = (0, helpers_1.generateReferralCode)();
            }
        }
        // 3️⃣ Validate referral code if provided
        let referredByUser = null;
        if (userData.referredBy) {
            referredByUser = await User_1.default.findOne({ referralCode: userData.referredBy });
            if (!referredByUser) {
                logger_1.default.warn(`Invalid referral code used during registration: ${userData.referredBy}`);
                // Optionally throw error to enforce valid codes:
                // throw new BadRequestError('Invalid referral code');
            }
        }
        // 4️⃣ Generate email verification token
        const emailVerificationToken = (0, helpers_1.generateVerificationToken)();
        const emailVerificationExpires = (0, helpers_1.addDays)(new Date(), 1); // 24 hours
        // 5️⃣ Prepare user payload (without referredBy - will be set by referralService)
        const userPayload = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            password: userData.password,
            referralCode,
            emailVerificationToken: (0, helpers_1.hashString)(emailVerificationToken),
            emailVerificationExpires,
            role: userData.isVendor ? types_1.UserRole.VENDOR : types_1.UserRole.CLIENT,
            isVendor: userData.isVendor || false,
            isOnline: true,
            lastSeen: new Date(),
            lastLogin: new Date(),
        };
        // 6️⃣ Handle user location if provided
        if (userData.location) {
            const { location } = userData;
            console.log('📍 Processing location data:', location);
            // Validate location structure
            if (location.type === 'Point' &&
                Array.isArray(location.coordinates) &&
                location.coordinates.length === 2 &&
                location.address &&
                location.city &&
                location.state &&
                location.country) {
                // Validate coordinates
                const [longitude, latitude] = location.coordinates;
                if (typeof longitude === 'number' &&
                    typeof latitude === 'number' &&
                    longitude >= -180 && longitude <= 180 &&
                    latitude >= -90 && latitude <= 90) {
                    userPayload.location = {
                        type: location.type,
                        coordinates: location.coordinates,
                        address: location.address,
                        city: location.city,
                        state: location.state,
                        country: location.country,
                    };
                    console.log('✅ Location added to user payload:', userPayload.location);
                }
                else {
                    console.log('⚠️ Invalid coordinates:', { longitude, latitude });
                }
            }
            else {
                console.log('⚠️ Invalid location structure:', location);
            }
        }
        // 7️⃣ Handle vendorProfile ONLY for vendors with valid location data
        if (userData.isVendor && userData.vendorProfile) {
            const { location, ...restProfile } = userData.vendorProfile;
            // Only add vendorProfile if we have valid location data
            if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
                userPayload.vendorProfile = {
                    ...restProfile,
                    location: {
                        type: 'Point',
                        coordinates: location.coordinates, // [longitude, latitude]
                        address: location.address || '',
                        city: location.city || '',
                        state: location.state || '',
                        country: location.country || '',
                    },
                };
            }
            else if (Object.keys(restProfile).length > 0) {
                // If no location but other vendor profile data exists
                userPayload.vendorProfile = restProfile;
            }
        }
        // 8️⃣ Create user
        const user = await User_1.default.create(userPayload);
        // 9️⃣ Apply referral code if provided and valid
        if (userData.referredBy) {
            console.log('📋 Referral Data Check:', {
                referralCodeProvided: userData.referredBy,
                referrerFound: !!referredByUser,
                referrerId: referredByUser?._id.toString(),
                newUserId: user._id.toString(),
            });
            if (referredByUser) {
                try {
                    console.log('🎯 Calling referralService.applyReferralCode...');
                    const referralRecord = await referral_service_1.default.applyReferralCode(user._id.toString(), userData.referredBy);
                    console.log('✅ Referral record created successfully:', {
                        referralId: referralRecord._id.toString(),
                        status: referralRecord.status,
                        referrer: referralRecord.referrer.toString(),
                        referee: referralRecord.referee.toString(),
                    });
                    logger_1.default.info(`✅ Referral code applied: ${userData.referredBy} for user: ${user.email}`);
                }
                catch (error) {
                    console.log('❌ Error applying referral:', {
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                    });
                    logger_1.default.error(`❌ Error applying referral code: ${error.message}`, error);
                }
            }
            else {
                console.log('⚠️ Referral code provided but referrer not found:', userData.referredBy);
            }
        }
        else {
            console.log('ℹ️ No referral code provided during registration');
        }
        // 🔟 Generate tokens
        const tokens = await this.generateTokens(user);
        // 1️⃣1️⃣ Send welcome email with verification link
        await email_service_1.default.sendWelcomeEmail(user.email, user.firstName, emailVerificationToken);
        logger_1.default.info(`New user registered: ${user.email}${userData.referredBy ? ` with referral code: ${userData.referredBy}` : ''}`);
        return { user, tokens };
    }
    /**
       * Login user
       */
    async login(email, password, ipAddress, userAgent) {
        // Find user with password field
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user) {
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        // Check if account is locked
        if (user.isAccountLocked()) {
            throw new errors_1.UnauthorizedError('Account is locked due to multiple failed login attempts. Please try again later.');
        }
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await user.incrementLoginAttempts();
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        // Reset login attempts on successful login
        await user.resetLoginAttempts();
        // Check if email is verified
        if (!user.isEmailVerified) {
            try {
                // Automatically resend verification email
                await this.resendVerificationEmail(user.email);
                throw new errors_1.UnauthorizedError('Please verify your email address before logging in. A new verification link has been sent to your email.');
            }
            catch (error) {
                // If resending fails, still inform the user about verification requirement
                if (error.message === 'Email is already verified') {
                    // This shouldn't happen, but handle it just in case
                    throw error;
                }
                throw new errors_1.UnauthorizedError('Please verify your email address before logging in. Check your inbox for the verification link or request a new one.');
            }
        }
        // Check if account is active
        if (user.status === types_1.UserStatus.SUSPENDED) {
            throw new errors_1.UnauthorizedError('Your account has been suspended');
        }
        if (user.status === types_1.UserStatus.INACTIVE) {
            throw new errors_1.UnauthorizedError('Your account is inactive. Please contact support.');
        }
        // Update online status and login time
        user.isOnline = true;
        user.lastLogin = new Date();
        user.lastSeen = new Date();
        await user.save();
        // Generate tokens
        const tokens = await this.generateTokens(user);
        // Send login notification email (optional, can be disabled)
        if (config_1.default.env === 'production' && ipAddress && userAgent) {
            email_service_1.default.sendLoginNotification(user.email, user.firstName, ipAddress, userAgent);
        }
        logger_1.default.info(`User logged in: ${user.email}`);
        return { user, tokens };
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.default.jwt.refreshSecret);
            // Find user
            const user = await User_1.default.findById(decoded.id).select('+refreshToken');
            if (!user) {
                throw new errors_1.UnauthorizedError('Invalid refresh token');
            }
            // Check if refresh token matches
            if (user.refreshToken !== refreshToken) {
                throw new errors_1.UnauthorizedError('Invalid refresh token');
            }
            // Update online status on token refresh
            user.isOnline = true;
            user.lastSeen = new Date();
            // Generate new tokens
            const tokens = await this.generateTokens(user);
            return tokens;
        }
        catch (error) {
            throw new errors_1.UnauthorizedError('Invalid or expired refresh token');
        }
    }
    /**
     * Logout user
     */
    async logout(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Set user offline on logout
        user.isOnline = false;
        user.lastSeen = new Date();
        user.refreshToken = undefined;
        await user.save();
        logger_1.default.info(`User logged out: ${user.email}`);
    }
    /**
     * Verify email
     */
    async verifyEmail(token) {
        const hashedToken = (0, helpers_1.hashString)(token);
        const user = await User_1.default.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: new Date() },
        });
        if (!user) {
            throw new errors_1.BadRequestError('Invalid or expired verification token');
        }
        // Update user
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        // Activate account if it was pending verification
        if (user.status === types_1.UserStatus.PENDING_VERIFICATION) {
            user.status = types_1.UserStatus.ACTIVE;
        }
        // Update activity
        user.lastSeen = new Date();
        await user.save();
        // Send success email
        await email_service_1.default.sendVerificationSuccessEmail(user.email, user.firstName);
        logger_1.default.info(`Email verified: ${user.email}`);
        return user;
    }
    /**
     * Resend verification email
     */
    async resendVerificationEmail(email) {
        const user = await User_1.default.findOne({ email });
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (user.isEmailVerified) {
            throw new errors_1.BadRequestError('Email is already verified');
        }
        // Generate new verification token
        const emailVerificationToken = (0, helpers_1.generateVerificationToken)();
        const emailVerificationExpires = (0, helpers_1.addDays)(new Date(), 1);
        user.emailVerificationToken = (0, helpers_1.hashString)(emailVerificationToken);
        user.emailVerificationExpires = emailVerificationExpires;
        await user.save();
        // Send verification email
        await email_service_1.default.sendVerificationEmail(user.email, user.firstName, emailVerificationToken);
        logger_1.default.info(`Verification email resent: ${user.email}`);
    }
    /**
     * Request password reset
     */
    async forgotPassword(email) {
        const user = await User_1.default.findOne({ email });
        if (!user) {
            // Don't reveal that user doesn't exist
            logger_1.default.warn(`Password reset requested for non-existent email: ${email}`);
            return;
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const passwordResetToken = (0, helpers_1.hashString)(resetToken);
        const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpires = passwordResetExpires;
        await user.save();
        // Send reset email
        await email_service_1.default.sendPasswordResetEmail(user.email, user.firstName, resetToken);
        logger_1.default.info(`Password reset requested: ${user.email}`);
    }
    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        const hashedToken = (0, helpers_1.hashString)(token);
        const user = await User_1.default.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
        }).select('+password');
        if (!user) {
            throw new errors_1.BadRequestError('Invalid or expired reset token');
        }
        // Update password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.refreshToken = undefined; // Invalidate all sessions
        // Set offline when password is reset (security measure)
        user.isOnline = false;
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`Password reset successful: ${user.email}`);
    }
    /**
     * Change password (for authenticated users)
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User_1.default.findById(userId).select('+password');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            throw new errors_1.UnauthorizedError('Current password is incorrect');
        }
        // Update password
        user.password = newPassword;
        user.refreshToken = undefined; // Invalidate all sessions
        // Keep user online after password change (they're authenticated)
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`Password changed: ${user.email}`);
    }
    /**
     * Verify token (utility method)
     */
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        }
        catch (error) {
            throw new errors_1.UnauthorizedError('Invalid or expired token');
        }
    }
}
exports.default = new AuthService();
//# sourceMappingURL=auth.service.js.map