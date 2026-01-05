import { Resend } from 'resend';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { EmailTemplate } from '../types';

class EmailService {
  private resend: Resend;
  private templates: Map<EmailTemplate, handlebars.TemplateDelegate>;

  constructor() {
    this.resend = new Resend(config.email.user); // API KEY
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load email templates
   */
  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, '../templates/email');

    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
  }

  /**
   * Get or compile template
   */
  private getTemplate(templateName: EmailTemplate): handlebars.TemplateDelegate {
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    const templatePath = path.join(
      __dirname,
      '../templates/email',
      `${templateName}.hbs`
    );

    if (fs.existsSync(templatePath)) {
      const file = fs.readFileSync(templatePath, 'utf-8');
      const compiled = handlebars.compile(file);
      this.templates.set(templateName, compiled);
      return compiled;
    }

    return handlebars.compile(this.getDefaultTemplate(templateName));
  }

  /**
   * Default fallback template
   */
  private getDefaultTemplate(_templateName: EmailTemplate): string {
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
  public async sendEmail(
    to: string,
    subject: string,
    template: EmailTemplate,
    data: any
  ): Promise<boolean> {
    try {
      const compiledTemplate = this.getTemplate(template);

      const html = compiledTemplate({
        ...data,
        appName: config.app.name,
        supportEmail: config.app.supportEmail,
        year: new Date().getFullYear(),
        subject,
      });

      const result = await this.resend.emails.send({
        from: config.email.from,
        to,
        subject,
        html,
      });

      if (result.error) {
        logger.error('Resend Error:', result.error);
        return false;
      }

      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error('Error sending email with Resend:', error);
      return false;
    }
  }

  /**
   * Simulate transport verify (Resend has no verify())
   */
  public async verifyConnection(): Promise<boolean> {
    if (!config.email.user) {
      logger.error('Missing Resend API key');
      return false;
    }
    logger.info('Resend email service ready.');
    return true;
  }

  /**
   * Send welcome email
   */
  public async sendWelcomeEmail(
    email: string,
    firstName: string,
    verificationToken?: string
  ): Promise<boolean> {
    const verificationUrl = verificationToken
      ? `${config.urls.frontend}/verify-email?token=${verificationToken}`
      : null;

    return this.sendEmail(
      email,
      'Welcome to SharpLook!',
      EmailTemplate.WELCOME,
      {
        firstName,
        verificationUrl,
        body: `
          <h2>Welcome aboard, ${firstName}! 🎉</h2>
          <p>We're thrilled to have you join SharpLook!</p>
          ${
            verificationUrl
              ? `
              <p>Click below to verify your email:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>If the button doesn’t work, use this link:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p><small>This link expires in 24 hours.</small></p>
            `
              : ''
          }
          <p>If you didn’t create this account, you can ignore this message.</p>
        `,
      }
    );
  }

  /**
   * Send verification email
   */
  public async sendVerificationEmail(
    email: string,
    firstName: string,
    otp: string
  ): Promise<boolean> {
    return this.sendEmail(
      email,
      'Verify Your Email Address',
      EmailTemplate.VERIFICATION,
      {
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
      }
    );
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${config.urls.frontend}/reset-password?token=${resetToken}`;

    return this.sendEmail(
      email,
      'Reset Your Password',
      EmailTemplate.PASSWORD_RESET,
      {
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
      }
    );
  }

  /**
   * Send login notification email
   */
  public async sendLoginNotification(
    email: string,
    firstName: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    return this.sendEmail(
      email,
      'New Login Alert',
      EmailTemplate.LOGIN,
      {
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
      }
    );
  }

  /**
   * Send email verification success
   */
  public async sendVerificationSuccessEmail(
    email: string,
    firstName: string
  ): Promise<boolean> {
    return this.sendEmail(
      email,
      'Email Verified Successfully',
      EmailTemplate.VERIFICATION,
      {
        firstName,
        body: `
          <h2>Email Verified! ✅</h2>
          <p>Hi ${firstName},</p>
          <p>Your email address is now verified. Enjoy full access!</p>
          <a href="${config.urls.frontend}/dashboard" class="button">Go to Dashboard</a>
        `,
      }
    );
  }
}

export default new EmailService();
