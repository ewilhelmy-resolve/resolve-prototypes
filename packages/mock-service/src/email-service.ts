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
