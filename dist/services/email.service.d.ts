import { EmailTemplate } from '../types';
declare class EmailService {
    private resend;
    private templates;
    constructor();
    /**
     * Load email templates
     */
    private loadTemplates;
    /**
     * Get or compile template
     */
    private getTemplate;
    /**
     * Default fallback template
     */
    private getDefaultTemplate;
    /**
     * Generate styled button HTML
     */
    private getButtonHtml;
    /**
     * Send email using Resend
     */
    sendEmail(to: string, subject: string, template: EmailTemplate, data: any): Promise<boolean>;
    /**
     * Send new booking notification email to vendor
     */
    sendVendorNewBookingEmail(email: string, vendorFirstName: string, booking: {
        bookingNumber?: string;
        clientName: string;
        serviceName: string;
        scheduledDate: string;
        totalAmount: number;
    }): Promise<boolean>;
    /**
     * Simulate transport verify (Resend has no verify())
     */
    verifyConnection(): Promise<boolean>;
    /**
     * Send welcome email (on registration, with verification token)
     */
    sendWelcomeEmail(email: string, firstName: string, verificationToken?: string): Promise<boolean>;
    /**
     * Send verification email (resend OTP)
     */
    sendVerificationEmail(email: string, firstName: string, otp: string): Promise<boolean>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean>;
    /**
     * Send login notification email
     */
    sendLoginNotification(email: string, firstName: string, ipAddress: string, userAgent: string): Promise<boolean>;
    /**
     * Send email verification success + welcome message for clients
     */
    sendVerificationSuccessEmail(email: string, firstName: string): Promise<boolean>;
    /**
     * Send CEO welcome email for clients (after verification)
     */
    sendClientWelcomeEmail(email: string, firstName: string): Promise<boolean>;
    /**
     * Send CEO welcome email for vendors (after verification)
     */
    sendVendorWelcomeEmail(email: string, firstName: string): Promise<boolean>;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.service.d.ts.map