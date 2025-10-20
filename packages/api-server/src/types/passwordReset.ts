// Password reset types for Rita project
// Contains database row types and service input/output types for password reset functionality

/**
 * password_reset_tokens table row
 */
export interface PasswordResetTokenRow {
  id: string; // UUID
  user_email: string;
  reset_token: string;
  token_expires_at: Date;
  created_at: Date;
  used_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Request password reset input
 */
export interface RequestPasswordResetInput {
  email: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Request password reset result
 */
export interface RequestPasswordResetResult {
  token: string;
  expiresAt: Date;
}

/**
 * Verify token result
 */
export interface VerifyTokenResult {
  valid: boolean;
  email?: string;
  error?: string;
  code?: string;
}

/**
 * Reset password input
 */
export interface ResetPasswordInput {
  token: string;
}

/**
 * Reset password result
 */
export interface ResetPasswordResult {
  success: boolean;
  email?: string;
  tokenId?: string;
  error?: string;
  code?: string;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}
