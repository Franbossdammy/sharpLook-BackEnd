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
     * Send email using Resend
     */
    sendEmail(to: string, subject: string, template: EmailTemplate, data: any): Promise<boolean>;
    /**
     * Simulate transport verify (Resend has no verify())
     */
    verifyConnection(): Promise<boolean>;
    /**
     * Send welcome email
     */
    sendWelcomeEmail(email: string, firstName: string, verificationToken?: string): Promise<boolean>;
    /**
     * Send verification email
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
     * Send email verification success
     */
    sendVerificationSuccessEmail(email: string, firstName: string): Promise<boolean>;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.service.d.ts.map