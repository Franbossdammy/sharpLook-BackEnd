import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import User, { IUser } from '../models/User';
import emailService from './email.service';
import referralService from './referral.service';
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors';
import {
  generateReferralCode,
  generateVerificationToken,
  hashString,
  addDays,
} from '../utils/helpers';
import { UserRole, UserStatus } from '../types';
import logger from '../utils/logger';

interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Generate JWT access token
   */
  private generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(user: IUser): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Generate both tokens
   */
  private async generateTokens(user: IUser): Promise<AuthTokens> {
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
  public async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    referredBy?: string;
    isVendor?: boolean;
    vendorProfile?: any;
    location?: {
      type: 'Point';
      coordinates: [number, number];
      address: string;
      city: string;
      state: string;
      country: string;
    };
  }): Promise<{ user: IUser; tokens: AuthTokens }> {
    // 1️⃣ Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { phone: userData.phone }],
    });
    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new ConflictError('Email already registered');
      }
      throw new ConflictError('Phone number already registered');
    }

    // 2️⃣ Generate unique referral code
    let referralCode = generateReferralCode();
    let isUnique = false;
    while (!isUnique) {
      const existingCode = await User.findOne({ referralCode });
      if (!existingCode) {
        isUnique = true;
      } else {
        referralCode = generateReferralCode();
      }
    }

    // 3️⃣ Validate referral code if provided
    let referredByUser = null;
    if (userData.referredBy) {
      referredByUser = await User.findOne({ referralCode: userData.referredBy });
      if (!referredByUser) {
        logger.warn(`Invalid referral code used during registration: ${userData.referredBy}`);
        // Optionally throw error to enforce valid codes:
        // throw new BadRequestError('Invalid referral code');
      }
    }

    // 4️⃣ Generate email verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpires = addDays(new Date(), 1); // 24 hours

    // 5️⃣ Prepare user payload (without referredBy - will be set by referralService)
    const userPayload: any = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      referralCode,
      emailVerificationToken: hashString(emailVerificationToken),
      emailVerificationExpires,
      role: userData.isVendor ? UserRole.VENDOR : UserRole.CLIENT,
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
      if (
        location.type === 'Point' &&
        Array.isArray(location.coordinates) &&
        location.coordinates.length === 2 &&
        location.address &&
        location.city &&
        location.state &&
        location.country
      ) {
        // Validate coordinates
        const [longitude, latitude] = location.coordinates;
        if (
          typeof longitude === 'number' &&
          typeof latitude === 'number' &&
          longitude >= -180 && longitude <= 180 &&
          latitude >= -90 && latitude <= 90
        ) {
          userPayload.location = {
            type: location.type,
            coordinates: location.coordinates,
            address: location.address,
            city: location.city,
            state: location.state,
            country: location.country,
          };
          console.log('✅ Location added to user payload:', userPayload.location);
        } else {
          console.log('⚠️ Invalid coordinates:', { longitude, latitude });
        }
      } else {
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
      } else if (Object.keys(restProfile).length > 0) {
        // If no location but other vendor profile data exists
        userPayload.vendorProfile = restProfile;
      }
    }

    // 8️⃣ Create user
    const user = await User.create(userPayload);

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
          
          const referralRecord = await referralService.applyReferralCode(
            user._id.toString(),
            userData.referredBy
          );
          
          console.log('✅ Referral record created successfully:', {
            referralId: referralRecord._id.toString(),
            status: referralRecord.status,
            referrer: referralRecord.referrer.toString(),
            referee: referralRecord.referee.toString(),
          });
          
          logger.info(`✅ Referral code applied: ${userData.referredBy} for user: ${user.email}`);
        } catch (error: any) {
          console.log('❌ Error applying referral:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
          logger.error(`❌ Error applying referral code: ${error.message}`, error);
        }
      } else {
        console.log('⚠️ Referral code provided but referrer not found:', userData.referredBy);
      }
    } else {
      console.log('ℹ️ No referral code provided during registration');
    }

    // 🔟 Generate tokens
    const tokens = await this.generateTokens(user);

    // 1️⃣1️⃣ Send welcome email with verification link
    await emailService.sendWelcomeEmail(
      user.email,
      user.firstName,
      emailVerificationToken
    );

    logger.info(`New user registered: ${user.email}${userData.referredBy ? ` with referral code: ${userData.referredBy}` : ''}`);
    
    return { user, tokens };
  }

/**
   * Login user
   */
  public async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new UnauthorizedError(
        'Account is locked due to multiple failed login attempts. Please try again later.'
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new UnauthorizedError('Invalid email or password');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

  // Check if email is verified
if (!user.isEmailVerified) {
  try {
    // Automatically resend verification email
    await this.resendVerificationEmail(user.email);
    
    throw new UnauthorizedError(
      'Please verify your email address before logging in. A new verification link has been sent to your email.'
    );
  } catch (error: any) {
    // If resending fails, still inform the user about verification requirement
    if (error.message === 'Email is already verified') {
      // This shouldn't happen, but handle it just in case
      throw error;
    }
    
    throw new UnauthorizedError(
      'Please verify your email address before logging in. Check your inbox for the verification link or request a new one.'
    );
  }
}

    // Check if account is active
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedError('Your account has been suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedError('Your account is inactive. Please contact support.');
    }

    // Update online status and login time
    user.isOnline = true;
    user.lastLogin = new Date();
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Send login notification email (optional, can be disabled)
    if (config.env === 'production' && ipAddress && userAgent) {
      emailService.sendLoginNotification(
        user.email,
        user.firstName,
        ipAddress,
        userAgent
      );
    }

    logger.info(`User logged in: ${user.email}`);

    return { user, tokens };
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;

      // Find user
      const user = await User.findById(decoded.id).select('+refreshToken');

      if (!user) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Check if refresh token matches
      if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Update online status on token refresh
      user.isOnline = true;
      user.lastSeen = new Date();

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  public async logout(userId: string): Promise<void> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Set user offline on logout
    user.isOnline = false;
    user.lastSeen = new Date();
    user.refreshToken = undefined;
    await user.save();

    logger.info(`User logged out: ${user.email}`);
  }

  /**
   * Verify email
   */
  public async verifyEmail(token: string): Promise<IUser> {
    const hashedToken = hashString(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    // Activate account if it was pending verification
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      user.status = UserStatus.ACTIVE;
    }

    // Update activity
    user.lastSeen = new Date();

    await user.save();

    // Send success email
    await emailService.sendVerificationSuccessEmail(user.email, user.firstName);

    logger.info(`Email verified: ${user.email}`);

    return user;
  }

  /**
   * Resend verification email
   */
  public async resendVerificationEmail(email: string): Promise<void> {
    const user = await User.findOne({ email });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpires = addDays(new Date(), 1);

    user.emailVerificationToken = hashString(emailVerificationToken);
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(
      user.email,
      user.firstName,
      emailVerificationToken
    );

    logger.info(`Verification email resent: ${user.email}`);
  }

  /**
   * Request password reset
   */
  public async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal that user doesn't exist
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = hashString(resetToken);
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

    logger.info(`Password reset requested: ${user.email}`);
  }

  /**
   * Reset password
   */
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = hashString(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
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

    logger.info(`Password reset successful: ${user.email}`);
  }

  /**
   * Change password (for authenticated users)
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    user.refreshToken = undefined; // Invalidate all sessions
    // Keep user online after password change (they're authenticated)
    user.lastSeen = new Date();

    await user.save();

    logger.info(`Password changed: ${user.email}`);
  }

  /**
   * Verify token (utility method)
   */
  public verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}

export default new AuthService();