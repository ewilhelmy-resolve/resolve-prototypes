// Auth API types for Rita project

/**
 * Password Reset Request API Types
 */
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: true;
  message: string; // Generic message (prevent email enumeration)
}

/**
 * Verify Reset Token API Types
 */
export interface VerifyResetTokenRequest {
  token: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  email?: string; // Only present if valid
  error?: string;
  code?: string; // Error code (PWD_RESET_001, etc.)
}

/**
 * Reset Password API Types
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  email?: string;
  error?: string;
  code?: string; // Error code
}

/**
 * Password Reset Error Codes
 */
export enum PasswordResetErrorCode {
  INVALID_TOKEN = 'PWD_RESET_001',
  TOKEN_ALREADY_USED = 'PWD_RESET_002',
  TOKEN_EXPIRED = 'PWD_RESET_003',
  WEBHOOK_FAILURE = 'PWD_RESET_004',
  WEAK_PASSWORD = 'PWD_RESET_005',
  RATE_LIMIT_EXCEEDED = 'PWD_RESET_006'
}
