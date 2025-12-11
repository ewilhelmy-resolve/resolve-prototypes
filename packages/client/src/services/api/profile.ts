/**
 * Profile API Client
 * Handles user profile update operations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface UpdateProfileRequest {
	firstName?: string;
	lastName?: string;
}

export interface UpdateProfileResponse {
	success: boolean;
	user: {
		id: string;
		email: string;
		firstName: string | null;
		lastName: string | null;
	};
}

export const profileApi = {
	/**
	 * Update user profile (first name, last name)
	 * @param data - Profile fields to update
	 * @returns Updated user data
	 */
	async updateProfile(
		data: UpdateProfileRequest,
	): Promise<UpdateProfileResponse> {
		const response = await fetch(`${API_BASE_URL}/auth/profile`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include", // Include session cookie
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({
				error: "Failed to update profile",
			}));
			throw new Error(error.error || "Failed to update profile");
		}

		return response.json();
	},
};
