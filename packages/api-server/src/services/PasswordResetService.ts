import crypto from 'crypto';
import { pool } from '../config/database.js';
import type {
  PasswordResetTokenRow,
  RequestPasswordResetInput,
  RequestPasswordResetResult,
  VerifyTokenResult,
  ResetPasswordInput,
  ResetPasswordResult,
  PasswordValidationResult
} from '../types/passwordReset.js';
import { PasswordResetErrorCode } from '../types/auth.js';

export class PasswordResetService {
  /**
   * Request password reset - generates token and triggers webhook
   * Includes opportunistic cleanup of old tokens
   */
  async requestReset(params: RequestPasswordResetInput): Promise<RequestPasswordResetResult | null> {
    const { email, ipAddress, userAgent } = params;

    // Check if user exists
    const userResult = await pool.query(
      `SELECT user_id, email FROM user_profiles WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // User doesn't exist - return null (caller returns generic success message)
      return null;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Opportunistic cleanup: Remove old tokens before inserting new one
      // This eliminates the need for a separate cron job
      await client.query(`
        DELETE FROM password_reset_tokens
        WHERE (
          -- Delete expired tokens (>24 hours past expiration)
          token_expires_at < NOW() - INTERVAL '24 hours'
        ) OR (
          -- Delete old used tokens (>7 days old)
          used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days'
        )
      `);

      // Delete any existing active tokens for this email (only one active reset per user)
      await client.query(
        `DELETE FROM password_reset_tokens
         WHERE user_email = $1 AND used_at IS NULL`,
        [email]
      );

      // Generate new token
      const resetToken = crypto.randomBytes(32).toString('hex'); // 64 chars
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Insert new token
      const result = await client.query<PasswordResetTokenRow>(
        `INSERT INTO password_reset_tokens
           (user_email, reset_token, token_expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, reset_token, token_expires_at`,
        [email, resetToken, expiresAt, ipAddress, userAgent]
      );

      await client.query('COMMIT');

      return {
        token: result.rows[0].reset_token,
        expiresAt: result.rows[0].token_expires_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify reset token validity
   */
  async verifyToken(token: string): Promise<VerifyTokenResult> {
    // Validate token format (64-character hex string)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return {
        valid: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    const result = await pool.query<PasswordResetTokenRow>(
      `SELECT id, user_email, token_expires_at, used_at
       FROM password_reset_tokens
       WHERE reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    const resetToken = result.rows[0];

    // Check if already used
    if (resetToken.used_at !== null) {
      return {
        valid: false,
        error: 'This reset link has already been used',
        code: PasswordResetErrorCode.TOKEN_ALREADY_USED
      };
    }

    // Check if expired
    if (new Date(resetToken.token_expires_at) < new Date()) {
      return {
        valid: false,
        error: 'This reset link has expired. Please request a new one.',
        code: PasswordResetErrorCode.TOKEN_EXPIRED
      };
    }

    // Token is valid
    return {
      valid: true,
      email: resetToken.user_email
    };
  }

  /**
   * Reset password - marks token as used and returns token details for webhook
   * IMPORTANT: This only marks the token as used. Caller must trigger webhook to update Keycloak.
   */
  async resetPassword(params: ResetPasswordInput): Promise<ResetPasswordResult> {
    const { token } = params;

    // Validate token format
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return {
        success: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    // Get token details
    const selectResult = await pool.query<PasswordResetTokenRow>(
      `SELECT id, user_email, token_expires_at, used_at
       FROM password_reset_tokens
       WHERE reset_token = $1`,
      [token]
    );

    if (selectResult.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid or expired reset link',
        code: PasswordResetErrorCode.INVALID_TOKEN
      };
    }

    const resetToken = selectResult.rows[0];

    // Check if already used
    if (resetToken.used_at !== null) {
      return {
        success: false,
        error: 'This reset link has already been used',
        code: PasswordResetErrorCode.TOKEN_ALREADY_USED
      };
    }

    // Check if expired
    if (new Date(resetToken.token_expires_at) < new Date()) {
      return {
        success: false,
        error: 'This reset link has expired. Please request a new one.',
        code: PasswordResetErrorCode.TOKEN_EXPIRED
      };
    }

    // Mark token as used (atomic single-use enforcement)
    const updateResult = await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL
       RETURNING id, user_email`,
      [resetToken.id]
    );

    if (updateResult.rows.length === 0) {
      // Race condition - another process already used it
      return {
        success: false,
        error: 'This reset link has already been used',
        code: PasswordResetErrorCode.TOKEN_ALREADY_USED
      };
    }

    // Token successfully marked as used
    return {
      success: true,
      tokenId: updateResult.rows[0].id,
      email: updateResult.rows[0].user_email
    };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): PasswordValidationResult {
    if (!password || password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number'
      };
    }

    return { valid: true };
  }

  /**
   * Delete token (for cleanup after webhook failure)
   */
  async deleteToken(token: string): Promise<void> {
    await pool.query(
      `DELETE FROM password_reset_tokens WHERE reset_token = $1`,
      [token]
    );
  }
}
