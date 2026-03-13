"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const resend_1 = require("resend");
const handlebars_1 = __importDefault(require("handlebars"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const types_1 = require("../types");
const BRAND_COLOR = '#CC0000';
const BRAND_NAME = 'LookReal';
class EmailService {
    constructor() {
        this.resend = new resend_1.Resend(config_1.default.email.user); // API KEY
        this.templates = new Map();
        this.loadTemplates();
    }
    /**
     * Load email templates
     */
    loadTemplates() {
        const templatesDir = path_1.default.join(__dirname, '../templates/email');
        if (!fs_1.default.existsSync(templatesDir)) {
            fs_1.default.mkdirSync(templatesDir, { recursive: true });
        }
    }
    /**
     * Get or compile template
     */
    getTemplate(templateName) {
        if (this.templates.has(templateName)) {
            return this.templates.get(templateName);
        }
        const templatePath = path_1.default.join(__dirname, '../templates/email', `${templateName}.hbs`);
        if (fs_1.default.existsSync(templatePath)) {
            const file = fs_1.default.readFileSync(templatePath, 'utf-8');
            const compiled = handlebars_1.default.compile(file);
            this.templates.set(templateName, compiled);
            return compiled;
        }
        return handlebars_1.default.compile(this.getDefaultTemplate(templateName));
    }
    /**
     * Default fallback template
     */
    getDefaultTemplate(_templateName) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{{subject}}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 30px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background: ${BRAND_COLOR}; padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px;">${BRAND_NAME}</h1>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 40px 30px;">
                      {{{body}}}
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #eee;">
                      <p style="margin: 0 0 8px; color: #999; font-size: 12px;">&copy; {{year}} ${BRAND_NAME}. All rights reserved.</p>
                      <p style="margin: 0; color: #999; font-size: 12px;">{{supportEmail}}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    }
    /**
     * Generate styled button HTML
     */
    getButtonHtml(text, url) {
        return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td align="center">
            <a href="${url}" style="display: inline-block; padding: 14px 36px; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${text}</a>
          </td>
        </tr>
      </table>
    `;
    }
    /**
     * Send email using Resend
     */
    async sendEmail(to, subject, template, data) {
        try {
            const compiledTemplate = this.getTemplate(template);
            const html = compiledTemplate({
                ...data,
                appName: BRAND_NAME,
                supportEmail: config_1.default.app.supportEmail,
                year: new Date().getFullYear(),
                subject,
            });
            const result = await this.resend.emails.send({
                from: config_1.default.email.from,
                to,
                subject,
                html,
            });
            if (result.error) {
                logger_1.default.error('Resend Error:', result.error);
                return false;
            }
            logger_1.default.info(`Email sent successfully to ${to}: ${subject}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error sending email with Resend:', error);
            return false;
        }
    }
    /**
     * Simulate transport verify (Resend has no verify())
     */
    async verifyConnection() {
        if (!config_1.default.email.user) {
            logger_1.default.error('Missing Resend API key');
            return false;
        }
        logger_1.default.info('Resend email service ready.');
        return true;
    }
    /**
     * Send welcome email (on registration, with verification token)
     */
    async sendWelcomeEmail(email, firstName, verificationToken) {
        const verificationUrl = verificationToken
            ? `${config_1.default.urls.frontend}/verify-email?token=${verificationToken}`
            : null;
        return this.sendEmail(email, `Welcome to ${BRAND_NAME}!`, types_1.EmailTemplate.WELCOME, {
            firstName,
            verificationUrl,
            body: `
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">Welcome aboard, ${firstName}!</h2>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">We're thrilled to have you join ${BRAND_NAME}!</p>
          ${verificationUrl
                ? `
              <p style="margin: 0 0 8px; color: #555; font-size: 15px;">Click below to verify your email address:</p>
              ${this.getButtonHtml('Verify Email', verificationUrl)}
              <p style="margin: 0 0 8px; color: #888; font-size: 13px;">If the button doesn't work, copy and paste this link:</p>
              <p style="margin: 0 0 16px; word-break: break-all;"><a href="${verificationUrl}" style="color: ${BRAND_COLOR}; font-size: 13px;">${verificationUrl}</a></p>
              <p style="margin: 0; color: #999; font-size: 12px;">This link expires in 24 hours.</p>
            `
                : ''}
          <p style="margin: 16px 0 0; color: #888; font-size: 13px;">If you didn't create this account, you can ignore this message.</p>
        `,
        });
    }
    /**
     * Send verification email (resend OTP)
     */
    async sendVerificationEmail(email, firstName, otp) {
        return this.sendEmail(email, 'Verify Your Email Address', types_1.EmailTemplate.VERIFICATION, {
            firstName,
            otp,
            body: `
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">Email Verification</h2>
          <p style="margin: 0 0 8px; color: #555; font-size: 15px;">Hi ${firstName},</p>
          <p style="margin: 0 0 20px; color: #555; font-size: 15px;">Your One-Time Password (OTP) is:</p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 16px;
            background: #f8f8f8;
            border: 2px dashed ${BRAND_COLOR};
            border-radius: 8px;
            margin: 0 0 20px;
            letter-spacing: 6px;
            color: ${BRAND_COLOR};">
            ${otp}
          </div>

          <p style="margin: 0; color: #999; font-size: 13px;">This code expires in 10 minutes.</p>
        `,
        });
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, firstName, resetToken) {
        const resetUrl = `${config_1.default.urls.frontend}/reset-password?token=${resetToken}`;
        return this.sendEmail(email, 'Reset Your Password', types_1.EmailTemplate.PASSWORD_RESET, {
            firstName,
            resetUrl,
            body: `
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">Reset Your Password</h2>
          <p style="margin: 0 0 8px; color: #555; font-size: 15px;">Hi ${firstName},</p>
          <p style="margin: 0 0 8px; color: #555; font-size: 15px;">We received a request to reset your password. Click the button below to set a new one:</p>
          ${this.getButtonHtml('Reset Password', resetUrl)}
          <p style="margin: 0 0 8px; color: #888; font-size: 13px;">If the button doesn't work, copy and paste this link:</p>
          <p style="margin: 0 0 16px; word-break: break-all;"><a href="${resetUrl}" style="color: ${BRAND_COLOR}; font-size: 13px;">${resetUrl}</a></p>
          <p style="margin: 0 0 8px; color: #999; font-size: 12px;">This link expires in 1 hour.</p>
          <p style="margin: 0; color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        `,
        });
    }
    /**
     * Send login notification email
     */
    async sendLoginNotification(email, firstName, ipAddress, userAgent) {
        return this.sendEmail(email, 'New Login Alert', types_1.EmailTemplate.LOGIN, {
            firstName,
            ipAddress,
            userAgent,
            timestamp: new Date().toLocaleString(),
            body: `
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">New Login Detected</h2>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">Hi ${firstName},</p>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">A login occurred on your account:</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
            <tr><td style="padding: 8px 16px; color: #555; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString()}</td></tr>
            <tr><td style="padding: 8px 16px; color: #555; font-size: 14px;"><strong>IP Address:</strong> ${ipAddress}</td></tr>
            <tr><td style="padding: 8px 16px; color: #555; font-size: 14px;"><strong>Device:</strong> ${userAgent}</td></tr>
          </table>

          <p style="margin: 0 0 8px; color: #555; font-size: 15px;">If this was you, no action is needed.</p>
          <p style="margin: 0; color: ${BRAND_COLOR}; font-size: 15px; font-weight: 600;">If not, please change your password immediately.</p>
        `,
        });
    }
    /**
     * Send email verification success + welcome message for clients
     */
    async sendVerificationSuccessEmail(email, firstName) {
        return this.sendEmail(email, 'Email Verified Successfully', types_1.EmailTemplate.VERIFICATION, {
            firstName,
            body: `
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">Email Verified!</h2>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">Hi ${firstName},</p>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px;">Your email address has been verified successfully. You now have full access to ${BRAND_NAME}!</p>
        `,
        });
    }
    /**
     * Send CEO welcome email for clients (after verification)
     */
    async sendClientWelcomeEmail(email, firstName) {
        return this.sendEmail(email, `Welcome to ${BRAND_NAME} - From Our CEO`, types_1.EmailTemplate.WELCOME, {
            firstName,
            body: `
          <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px;">Welcome to ${BRAND_NAME}!</h2>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">Dear ${firstName},</p>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">On behalf of the entire team, I'm delighted to welcome you to the ${BRAND_NAME} community. Our mission is simple &mdash; to help you discover and book trusted professionals who help you look and feel your best.</p>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">${BRAND_NAME} was built to make finding quality beauty and lifestyle services easy, reliable, and convenient. Whether you're exploring new styles, booking your favorite professional, or discovering something new, we are here to make every experience smooth and enjoyable.</p>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px;">Thank you for choosing ${BRAND_NAME}. We're excited to be part of your journey.</p>

          <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 17px;">How to Get Started</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
            <tr>
              <td style="padding: 10px 0; color: #555; font-size: 14px; border-bottom: 1px solid #f0f0f0;">
                <strong style="color: ${BRAND_COLOR};">1.</strong> Browse services and products from trusted vendors near you.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #555; font-size: 14px; border-bottom: 1px solid #f0f0f0;">
                <strong style="color: ${BRAND_COLOR};">2.</strong> Book a service or place an order directly through the app.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #555; font-size: 14px; border-bottom: 1px solid #f0f0f0;">
                <strong style="color: ${BRAND_COLOR};">3.</strong> Pay securely &mdash; your payment is held in escrow until the service is completed.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #555; font-size: 14px; border-bottom: 1px solid #f0f0f0;">
                <strong style="color: ${BRAND_COLOR};">4.</strong> Rate and review your experience to help the community.
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #555; font-size: 14px;">
                <strong style="color: ${BRAND_COLOR};">5.</strong> Refer friends and earn rewards through our referral program.
              </td>
            </tr>
          </table>

          <p style="margin: 0 0 4px; color: #555; font-size: 15px;">Warm regards,</p>
          <p style="margin: 0 0 4px; color: #1a1a1a; font-size: 15px; font-weight: 700;">CEO</p>
          <p style="margin: 0; color: ${BRAND_COLOR}; font-size: 15px; font-weight: 700;">${BRAND_NAME}</p>
        `,
        });
    }
    /**
     * Send CEO welcome email for vendors (after verification)
     */
    async sendVendorWelcomeEmail(email, firstName) {
        return this.sendEmail(email, `Welcome to ${BRAND_NAME} - From Our CEO`, types_1.EmailTemplate.WELCOME, {
            firstName,
            body: `
          <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px;">Welcome to ${BRAND_NAME}!</h2>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">Dear ${firstName},</p>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">On behalf of the entire team at ${BRAND_NAME}, I'm excited to welcome you as a valued vendor on our platform. ${BRAND_NAME} was created to connect talented professionals like you with customers who are looking for quality, reliability, and exceptional service.</p>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">By joining ${BRAND_NAME}, you are becoming part of a growing community dedicated to professionalism, trust, and great customer experiences. We are committed to providing the tools and visibility you need to grow your business and reach more clients.</p>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px;">Thank you for choosing to partner with us. We look forward to seeing your success on ${BRAND_NAME}.</p>

          <p style="margin: 0 0 4px; color: #555; font-size: 15px;">Warm regards,</p>
          <p style="margin: 0 0 4px; color: #1a1a1a; font-size: 15px; font-weight: 700;">CEO</p>
          <p style="margin: 0; color: ${BRAND_COLOR}; font-size: 15px; font-weight: 700;">${BRAND_NAME}</p>
        `,
        });
    }
}
exports.default = new EmailService();
//# sourceMappingURL=email.service.js.map