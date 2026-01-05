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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{appName}}</h1>
            </div>
            <div class="content">
              {{{body}}}
            </div>
            <div class="footer">
              <p>© {{year}} {{appName}}. All rights reserved.</p>
              <p>{{supportEmail}}</p>
            </div>
          </div>
        </body>
      </html>
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
                appName: config_1.default.app.name,
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
     * Send welcome email
     */
    async sendWelcomeEmail(email, firstName, verificationToken) {
        const verificationUrl = verificationToken
            ? `${config_1.default.urls.frontend}/verify-email?token=${verificationToken}`
            : null;
        return this.sendEmail(email, 'Welcome to SharpLook!', types_1.EmailTemplate.WELCOME, {
            firstName,
            verificationUrl,
            body: `
          <h2>Welcome aboard, ${firstName}! 🎉</h2>
          <p>We're thrilled to have you join SharpLook!</p>
          ${verificationUrl
                ? `
              <p>Click below to verify your email:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>If the button doesn’t work, use this link:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p><small>This link expires in 24 hours.</small></p>
            `
                : ''}
          <p>If you didn’t create this account, you can ignore this message.</p>
        `,
        });
    }
    /**
     * Send verification email
     */
    async sendVerificationEmail(email, firstName, otp) {
        return this.sendEmail(email, 'Verify Your Email Address', types_1.EmailTemplate.VERIFICATION, {
            firstName,
            otp,
            body: `
          <h2>Email Verification</h2>
          <p>Hi ${firstName},</p>
          <p>Your One-Time Password (OTP) is:</p>

          <div style="
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            padding: 12px;
            background: #f0f0f0;
            border-radius: 6px;
            margin: 20px 0;">
            ${otp}
          </div>

          <p>This code expires in 10 minutes.</p>
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
          <h2>Reset Your Password</h2>
          <p>Hi ${firstName},</p>
          <p>Click below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>

          <p>If the button doesn't work, open this link:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>

          <p><small>This link expires in 1 hour.</small></p>
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
          <h2>New Login Detected</h2>
          <p>Hi ${firstName},</p>
          <p>A login occurred on your account:</p>

          <ul>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>IP Address:</strong> ${ipAddress}</li>
            <li><strong>Device:</strong> ${userAgent}</li>
          </ul>

          <p>If this was you, no action is needed.</p>
          <p>If not, please change your password immediately.</p>
        `,
        });
    }
    /**
     * Send email verification success
     */
    async sendVerificationSuccessEmail(email, firstName) {
        return this.sendEmail(email, 'Email Verified Successfully', types_1.EmailTemplate.VERIFICATION, {
            firstName,
            body: `
          <h2>Email Verified! ✅</h2>
          <p>Hi ${firstName},</p>
          <p>Your email address is now verified. Enjoy full access!</p>
          <a href="${config_1.default.urls.frontend}/dashboard" class="button">Go to Dashboard</a>
        `,
        });
    }
}
exports.default = new EmailService();
//# sourceMappingURL=email.service.js.map