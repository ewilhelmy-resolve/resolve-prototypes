/**
 * Validation utilities for form inputs
 *
 * Provides reusable validation functions for common form fields
 * to ensure consistency across the application.
 */

/**
 * Password complexity requirements regex
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character (@$!%*?&#.)
 * - Only allows alphanumeric and special characters
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.])[A-Za-z\d@$!%*?&#.]+$/;

/**
 * Minimum password length requirement
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates password complexity
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (@$!%*?&#.)
 *
 * @param password - The password to validate (will be trimmed)
 * @returns Error message if invalid, null if valid
 *
 * @example
 * validatePassword("weak") // Returns: "Password must be at least 8 characters"
 * validatePassword("WeakPass") // Returns: "Password must contain uppercase, lowercase, number, and special character"
 * validatePassword("StrongP@ss1") // Returns: null (valid)
 */
export function validatePassword(password: string): string | null {
	const trimmedPassword = password.trim();

	if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
		return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
	}

	if (!PASSWORD_REGEX.test(trimmedPassword)) {
		return "Password must contain uppercase, lowercase, number, and special character";
	}

	return null;
}

/**
 * Validates email format
 *
 * @param email - The email to validate (will be trimmed)
 * @returns Error message if invalid, null if valid
 *
 * @example
 * validateEmail("invalid") // Returns: "Please enter a valid email address"
 * validateEmail("user@example.com") // Returns: null (valid)
 */
export function validateEmail(email: string): string | null {
	const trimmedEmail = email.trim();

	if (!trimmedEmail) {
		return "Email is required";
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
		return "Please enter a valid email address";
	}

	return null;
}

/**
 * Validates required text field
 *
 * @param value - The value to validate
 * @param fieldName - The name of the field for error message
 * @returns Error message if invalid, null if valid
 *
 * @example
 * validateRequired("", "First name") // Returns: "First name is required"
 * validateRequired("John", "First name") // Returns: null (valid)
 */
export function validateRequired(value: string, fieldName: string): string | null {
	if (!value.trim()) {
		return `${fieldName} is required`;
	}

	return null;
}
