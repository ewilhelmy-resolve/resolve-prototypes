import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logger } from './config/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    // Auto-detect SMTP host based on environment
    // Default to 'localhost' for local development (most common case)
    // Use 'mailpit' only when explicitly running in Docker
    const defaultHost = process.env.SMTP_HOST || 'localhost';

    this.transporter = nodemailer.createTransport({
      host: defaultHost,
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_AUTH === 'true' ? {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      } : undefined
    });

    logger.info({
      host: defaultHost,
      port: parseInt(process.env.SMTP_PORT || '1025', 10)
    }, '📧 Email service initialized');
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Rita Platform'}" <${process.env.SMTP_FROM || 'noreply@rita.local'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info({
        messageId: info.messageId,
        to: options.to,
        subject: options.subject
      }, '📧 Email sent successfully');
      console.log(`📬 Preview URL: http://localhost:8025`);
    } catch (error) {
      logger.error({ error, to: options.to, subject: options.subject }, '❌ Failed to send email');

      // Fallback to console logging
      console.log(`\n${'='.repeat(80)}`);
      console.log('📧 EMAIL (Fallback - Mailpit unavailable)');
      console.log('='.repeat(80));
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:\n${options.text}`);
      console.log(`${'='.repeat(80)}\n`);
    }
  }

  async sendSignupVerification(email: string, name: string, verificationUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Verify Your Rita Account',
      text: `Hi ${name},\n\nWelcome to Rita! Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nThe Rita Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #4F46E5; margin-top: 0;">Welcome to Rita!</h2>
            <p>Hi ${name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Verify Email</a>
            </div>
            <p style="color: #6B7280; font-size: 14px;">Or copy and paste this URL into your browser:</p>
            <p style="background-color: #fff; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">${verificationUrl}</p>
          </div>
          <p style="color: #6B7280; font-size: 12px; text-align: center;">If you didn't create this account, please ignore this email.</p>
          <p style="color: #6B7280; font-size: 12px; text-align: center;">Best regards,<br>The Rita Team</p>
        </body>
        </html>
      `
    });
  }

  async sendInvitation(
    email: string,
    invitedByName: string,
    organizationName: string,
    invitationUrl: string,
    expiresAt: string
  ): Promise<void> {
    const expiryDate = new Date(expiresAt).toLocaleString();

    await this.sendEmail({
      to: email,
      subject: `You're invited to join ${organizationName} on Rita`,
      text: `${invitedByName} has invited you to join ${organizationName} on Rita.\n\nAccept your invitation by clicking the link below:\n\n${invitationUrl}\n\nThis invitation expires on ${expiryDate}.\n\nBest regards,\nThe Rita Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #4F46E5; margin-top: 0;">You're Invited!</h2>
            <p><strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong> on Rita.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Accept Invitation</a>
            </div>
            <p style="color: #6B7280; font-size: 14px;">Or copy and paste this URL into your browser:</p>
            <p style="background-color: #fff; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">${invitationUrl}</p>
            <p style="color: #EF4444; font-size: 13px;"><strong>⏰ This invitation expires on ${expiryDate}.</strong></p>
          </div>
          <p style="color: #6B7280; font-size: 12px; text-align: center;">Best regards,<br>The Rita Team</p>
        </body>
        </html>
      `
    });
  }

  async sendCredentialDelegation(
    adminEmail: string,
    delegationUrl: string,
    organizationName: string,
    itsmSystemType: string,
    delegatedByEmail: string,
    expiresAt: string
  ): Promise<void> {
    const expiryDate = new Date(expiresAt).toLocaleString();
    const systemDisplayName = itsmSystemType.charAt(0).toUpperCase() + itsmSystemType.slice(1);

    await this.sendEmail({
      to: adminEmail,
      subject: `${organizationName} requests ITSM credential setup for ${systemDisplayName}`,
      text: `${delegatedByEmail} from ${organizationName} has requested you to set up ${systemDisplayName} credentials.\n\nSet up credentials by clicking the link below:\n\n${delegationUrl}\n\nThis link expires on ${expiryDate}.\n\nBest regards,\nThe Rita Team`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Help requested to configure ${systemDisplayName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header with Logo -->
                  <tr>
                    <td style="padding: 40px 40px 30px 40px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td>
                            <span style="font-size: 24px; font-weight: bold; color: #1a1a2e; letter-spacing: -0.5px;">RESOLVE</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Main Heading -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 400; color: #4169e1; line-height: 1.3;">
                        Help requested to configure ${systemDisplayName}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body Text -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                        ${delegatedByEmail} from ${organizationName} has invited you to finish the ${systemDisplayName} setup so Autopilot can import and automate tickets.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="border-radius: 25px; background: linear-gradient(135deg, #5b7ff5 0%, #4169e1 100%);">
                            <a href="${delegationUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 25px;">
                              Configure ${systemDisplayName}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Disclaimer Text -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">
                        If you don't have a Resolve account yet, you'll be asked to sign up first. This link gives access only to this configuration screen and expires on ${expiryDate}.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1a1a2e; border-radius: 0 0 8px 8px; padding: 25px 40px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="vertical-align: middle;">
                            <span style="font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">RESOLVE</span>
                            <span style="color: #4169e1; font-size: 14px;">⚡</span>
                            <span style="color: #888888; font-size: 14px; margin-left: 20px;">Blog</span>
                          </td>
                          <td style="text-align: right; vertical-align: middle;">
                            <!-- Social Icons -->
                            <a href="#" style="display: inline-block; margin-left: 12px; text-decoration: none;">
                              <span style="display: inline-block; width: 32px; height: 32px; background-color: #4169e1; border-radius: 4px; text-align: center; line-height: 32px; color: white; font-weight: bold; font-size: 14px;">in</span>
                            </a>
                            <a href="#" style="display: inline-block; margin-left: 12px; text-decoration: none;">
                              <span style="display: inline-block; width: 32px; height: 32px; background-color: #4169e1; border-radius: 4px; text-align: center; line-height: 32px; color: white; font-size: 16px;">𝕏</span>
                            </a>
                            <a href="#" style="display: inline-block; margin-left: 12px; text-decoration: none;">
                              <span style="display: inline-block; width: 32px; height: 32px; background-color: #4169e1; border-radius: 4px; text-align: center; line-height: 32px; color: white; font-size: 14px;">▶</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <!-- Footer Links -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 20px auto 0 auto;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="#" style="font-size: 13px; color: #4169e1; text-decoration: none;">Terms of use</a>
                      <span style="color: #cccccc; margin: 0 8px;">|</span>
                      <a href="#" style="font-size: 13px; color: #4169e1; text-decoration: none;">Privacy Policy</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });
  }

  async sendPasswordReset(email: string, resetUrl: string, expiresAt: string): Promise<void> {
    const expiryDate = new Date(expiresAt).toLocaleString();

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Rita Password',
      text: `You requested a password reset for your Rita account.\n\nReset your password by clicking the link below:\n\n${resetUrl}\n\nThis link expires on ${expiryDate}.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe Rita Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #4F46E5; margin-top: 0;">Password Reset Request</h2>
            <p>You requested a password reset for your Rita account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Reset Password</a>
            </div>
            <p style="color: #6B7280; font-size: 14px;">Or copy and paste this URL into your browser:</p>
            <p style="background-color: #fff; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">${resetUrl}</p>
            <p style="color: #EF4444; font-size: 13px;"><strong>⏰ This link expires on ${expiryDate}.</strong></p>
          </div>
          <p style="color: #6B7280; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
          <p style="color: #6B7280; font-size: 12px; text-align: center;">Best regards,<br>The Rita Team</p>
        </body>
        </html>
      `
    });
  }
}

export const emailService = new EmailService();
