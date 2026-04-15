import { Resend } from 'resend';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { EmailTemplate } from '../types';

const BRAND_COLOR = '#CC0000';
const BRAND_NAME = 'LookReal';

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
  private getButtonHtml(text: string, url: string): string {
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
        appName: BRAND_NAME,
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
   * Send new booking notification email to vendor
   */
  public async sendVendorNewBookingEmail(
    email: string,
    vendorFirstName: string,
    booking: {
      bookingNumber?: string;
      clientName: string;
      serviceName: string;
      scheduledDate: string;
      totalAmount: number;
    }
  ): Promise<boolean> {
    const formattedDate = new Date(booking.scheduledDate).toLocaleDateString('en-NG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const formattedAmount = `₦${booking.totalAmount.toLocaleString()}`;

    return this.sendEmail(
      email,
      'New Booking Request 📅',
      EmailTemplate.BOOKING_CONFIRMATION,
      {
        firstName: vendorFirstName,
        body: `
          <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">You have a new booking, ${vendorFirstName}!</h2>
          <p style="margin:0 0 16px;color:#555;font-size:15px;">A client has placed a booking for one of your services. Here are the details:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:20px;">
            <tr><td style="padding:6px 0;color:#888;font-size:13px;width:40%;">Booking #</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">${booking.bookingNumber || 'Pending'}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Client</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">${booking.clientName}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Service</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">${booking.serviceName}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Date</td><td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">${formattedDate}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Amount</td><td style="padding:6px 0;color:${BRAND_COLOR};font-size:16px;font-weight:700;">${formattedAmount}</td></tr>
          </table>
          <p style="margin:0 0 16px;color:#555;font-size:15px;">Open the app to accept or decline this booking.</p>
          <p style="margin:16px 0 0;color:#999;font-size:12px;">If you did not expect this, please contact support.</p>
        `,
      }
    );
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
   * Send welcome email (on registration, with verification token)
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
      `Welcome to ${BRAND_NAME}!`,
      EmailTemplate.WELCOME,
      {
        firstName,
        verificationUrl,
        body: `
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">Welcome aboard, ${firstName}!</h2>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">We're thrilled to have you join ${BRAND_NAME}!</p>
          ${
            verificationUrl
              ? `
              <p style="margin: 0 0 8px; color: #555; font-size: 15px;">Click below to verify your email address:</p>
              ${this.getButtonHtml('Verify Email', verificationUrl)}
              <p style="margin: 0 0 8px; color: #888; font-size: 13px;">If the button doesn't work, copy and paste this link:</p>
              <p style="margin: 0 0 16px; word-break: break-all;"><a href="${verificationUrl}" style="color: ${BRAND_COLOR}; font-size: 13px;">${verificationUrl}</a></p>
              <p style="margin: 0; color: #999; font-size: 12px;">This link expires in 24 hours.</p>
            `
              : ''
          }
          <p style="margin: 16px 0 0; color: #888; font-size: 13px;">If you didn't create this account, you can ignore this message.</p>
        `,
      }
    );
  }

  /**
   * Send verification email (resend OTP)
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
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">Reset Your Password</h2>
          <p style="margin: 0 0 8px; color: #555; font-size: 15px;">Hi ${firstName},</p>
          <p style="margin: 0 0 8px; color: #555; font-size: 15px;">We received a request to reset your password. Click the button below to set a new one:</p>
          ${this.getButtonHtml('Reset Password', resetUrl)}
          <p style="margin: 0 0 8px; color: #888; font-size: 13px;">If the button doesn't work, copy and paste this link:</p>
          <p style="margin: 0 0 16px; word-break: break-all;"><a href="${resetUrl}" style="color: ${BRAND_COLOR}; font-size: 13px;">${resetUrl}</a></p>
          <p style="margin: 0 0 8px; color: #999; font-size: 12px;">This link expires in 1 hour.</p>
          <p style="margin: 0; color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
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
      }
    );
  }

  /**
   * Send email verification success + welcome message for clients
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
          <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px;">Email Verified!</h2>
          <p style="margin: 0 0 16px; color: #555; font-size: 15px;">Hi ${firstName},</p>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px;">Your email address has been verified successfully. You now have full access to ${BRAND_NAME}!</p>
        `,
      }
    );
  }

  /**
   * Send CEO welcome email for clients (after verification)
   */
  public async sendClientWelcomeEmail(
    email: string,
    firstName: string
  ): Promise<boolean> {
    return this.sendEmail(
      email,
      `Welcome to ${BRAND_NAME} - From Our CEO`,
      EmailTemplate.WELCOME,
      {
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
      }
    );
  }

  /**
   * Send CEO welcome email for vendors (after verification)
   */
  public async sendVendorWelcomeEmail(
    email: string,
    firstName: string
  ): Promise<boolean> {
    return this.sendEmail(
      email,
      `Welcome to ${BRAND_NAME} - From Our CEO`,
      EmailTemplate.WELCOME,
      {
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
      }
    );
  }
}

export default new EmailService();
