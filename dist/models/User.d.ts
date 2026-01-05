import mongoose, { Document, Model } from 'mongoose';
import { UserRole, UserStatus, VendorType } from '../types';
export interface IUserPreferences {
    darkMode: boolean;
    fingerprintEnabled: boolean;
    notificationsEnabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    bookingUpdates: boolean;
    newMessages: boolean;
    paymentAlerts: boolean;
    reminderNotifications: boolean;
    promotions: boolean;
}
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    avatar?: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    refreshToken?: string;
    lastLogin?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    isOnline: boolean;
    lastSeen?: Date;
    preferences?: IUserPreferences;
    withdrawalPin?: string;
    hasWithdrawalPin?: boolean;
    referralCode: string;
    referredBy?: mongoose.Types.ObjectId;
    walletBalance: number;
    location?: {
        type: string;
        coordinates: [number, number];
        address: string;
        city: string;
        state: string;
        country: string;
    };
    isVendor: boolean;
    vendorProfile?: {
        businessName: string;
        businessDescription?: string;
        vendorType: VendorType;
        categories?: mongoose.Types.ObjectId[];
        location?: {
            type: string;
            coordinates: [number, number];
            address: string;
            city: string;
            state: string;
            country: string;
        };
        serviceRadius?: number;
        rating?: number;
        totalRatings?: number;
        completedBookings?: number;
        availabilitySchedule?: {
            monday: {
                isAvailable: boolean;
                from?: string;
                to?: string;
            };
            tuesday: {
                isAvailable: boolean;
                from?: string;
                to?: string;
            };
            wednesday: {
                isAvailable: boolean;
                from?: string;
                to?: string;
            };
            thursday: {
                isAvailable: boolean;
                from?: string;
                to?: string;
            };
            friday: {
                isAvailable: boolean;
                from?: string;
                to?: string;
            };
            saturday: {
                isAvailable: boolean;
                from?: string;
                to?: string;
            };
            sunday: {
                isAvailable: boolean;
                from?: string;
                to?: string;
            };
        };
        documents?: {
            idCard?: string;
            businessLicense?: string;
            certification?: string[];
        };
        isVerified?: boolean;
        verificationDate?: Date;
        redFlagCount?: number;
        lastRedFlagAt?: Date;
        isSuspended?: boolean;
        suspendedAt?: Date;
        suspensionReason?: string;
    };
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    isAccountLocked(): boolean;
    incrementLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
    isProfileComplete(): boolean;
    getProfileCompletionPercentage(): number;
    getMissingFields(): string[];
}
declare const User: Model<IUser>;
export default User;
//# sourceMappingURL=User.d.ts.map