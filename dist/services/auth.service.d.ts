import { IUser } from '../models/User';
import { UserRole } from '../types';
interface TokenPayload {
    id: string;
    email: string;
    role: UserRole;
}
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
declare class AuthService {
    /**
     * Generate JWT access token
     */
    private generateAccessToken;
    /**
     * Generate JWT refresh token
     */
    private generateRefreshToken;
    /**
     * Generate both tokens
     */
    private generateTokens;
    /**
     * Register a new user
     */
    register(userData: {
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
    }): Promise<{
        user: IUser;
        tokens: AuthTokens;
    }>;
    /**
       * Login user
       */
    login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{
        user: IUser;
        tokens: AuthTokens;
    }>;
    /**
     * Refresh access token
     */
    refreshToken(refreshToken: string): Promise<AuthTokens>;
    /**
     * Logout user
     */
    logout(userId: string): Promise<void>;
    /**
     * Verify email
     */
    verifyEmail(token: string): Promise<IUser>;
    /**
     * Resend verification email
     */
    resendVerificationEmail(email: string): Promise<void>;
    /**
     * Request password reset
     */
    forgotPassword(email: string): Promise<void>;
    /**
     * Reset password
     */
    resetPassword(token: string, newPassword: string): Promise<void>;
    /**
     * Change password (for authenticated users)
     */
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    /**
     * Verify token (utility method)
     */
    verifyAccessToken(token: string): TokenPayload;
}
declare const _default: AuthService;
export default _default;
//# sourceMappingURL=auth.service.d.ts.map