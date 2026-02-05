/**
 * Invitation System API Hooks
 *
 * TanStack Query hooks for invitation management with SOC2-compliant error handling
 * Based on backend API specification in /docs/user-invitation-system.md
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keycloak from "@/services/keycloak";
import {
	InvitationErrorCode,
	type AcceptInvitationRequest,
	type AcceptInvitationResponse,
	type CancelInvitationRequest,
	type CancelInvitationResponse,
	type InvitationAPIError,
	type ListInvitationsParams,
	type ListInvitationsResponse,
	type SendInvitationsRequest,
	type SendInvitationsResponse,
	type VerifyInvitationResponse,
} from "@/types/invitations";

/**
 * Query Keys for Cache Management
 */
export const invitationKeys = {
	all: ["invitations"] as const,
	lists: () => [...invitationKeys.all, "list"] as const,
	list: (params: ListInvitationsParams) =>
		[...invitationKeys.lists(), params] as const,
	verify: (token: string) => [...invitationKeys.all, "verify", token] as const,
	stats: () => [...invitationKeys.all, "stats"] as const,
};

/**
 * API Base Configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Fetch wrapper with cookie-based authentication (matches api.ts pattern)
 * Uses Keycloak token refresh + session cookies for authentication
 */
async function fetchWithAuth<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	// Cookie-only authentication: Keep Keycloak JWT fresh
	// Backend auto-extends session cookie when near expiry (sliding session)
	if (keycloak.authenticated && keycloak.token) {
		try {
			await keycloak.updateToken(5); // Refresh JWT if expires in 5s
		} catch (error) {
			console.error("Failed to refresh Keycloak token, logging out.", error);
			keycloak.logout();
		}
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
		credentials: "include", // Include cookies for session-based auth
	});

	if (!response.ok) {
		const error: InvitationAPIError = await response.json().catch(() => ({
			error: InvitationErrorCode.SERVER_ERROR,
			message: `HTTP ${response.status}: ${response.statusText}`,
		}));

		// Special handling for 401 to trigger re-authentication
		if (response.status === 401) {
			console.error("API request returned 401. Session may have expired.");
		}

		throw error;
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

/**
 * Public fetch wrapper for invitation endpoints (no authentication required)
 * Used for verify and accept endpoints which are accessed by users without accounts
 */
async function fetchPublic<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	if (!response.ok) {
		const error: InvitationAPIError = await response.json().catch(() => ({
			error: InvitationErrorCode.SERVER_ERROR,
			message: `HTTP ${response.status}: ${response.statusText}`,
		}));

		throw error;
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

/**
 * Hook: Send Invitations (Batch)
 *
 * Sends invitations to 1-50 email addresses with assigned role.
 * Triggers webhook for async processing.
 *
 * @example
 * const { mutate, isPending, error } = useSendInvitations()
 * mutate({
 *   emails: ['user1@example.com', 'user2@example.com'],
 *   role: UserRole.USER
 * })
 */
export function useSendInvitations() {
	const queryClient = useQueryClient();

	return useMutation<
		SendInvitationsResponse,
		InvitationAPIError,
		SendInvitationsRequest
	>({
		mutationFn: async (data: SendInvitationsRequest) => {
			return fetchWithAuth<SendInvitationsResponse>(
				"/api/invitations/send",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			);
		},
		onSuccess: () => {
			// Invalidate invitation lists to refetch with new data
			queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
			queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
		},
		meta: {
			errorMessage: "Failed to send invitations",
		},
	});
}

/**
 * Hook: Verify Invitation Token
 *
 * Validates invitation token and returns invitation details.
 * Used on invite accept page before showing form.
 * PUBLIC endpoint - no authentication required (users don't have accounts yet)
 *
 * @param token - Invitation token from URL
 * @param enabled - Whether to run query (default: true)
 *
 * @example
 * const { data, isLoading, error } = useVerifyInvitation(token)
 */
export function useVerifyInvitation(token: string, enabled = true) {
	return useQuery<VerifyInvitationResponse, InvitationAPIError>({
		queryKey: invitationKeys.verify(token),
		queryFn: async () => {
			return fetchPublic<VerifyInvitationResponse>(
				`/api/invitations/verify/${token}`,
			);
		},
		enabled: enabled && !!token,
		retry: false, // Don't retry on token verification failures
		staleTime: 0, // Always check freshness for security
		meta: {
			errorMessage: "Failed to verify invitation",
		},
	});
}

/**
 * Hook: Accept Invitation
 *
 * Accepts invitation and creates user account in Keycloak and Rita DB.
 * Password is sent directly to Keycloak, never stored in Rita.
 * PUBLIC endpoint - no authentication required (users don't have accounts yet)
 *
 * @example
 * const { mutate, isPending, error } = useAcceptInvitation()
 * mutate({
 *   token: 'invitation-token-here',
 *   password: 'SecurePass123!',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * })
 */
export function useAcceptInvitation() {
	return useMutation<
		AcceptInvitationResponse,
		InvitationAPIError,
		AcceptInvitationRequest
	>({
		mutationFn: async (data: AcceptInvitationRequest) => {
			return fetchPublic<AcceptInvitationResponse>(
				"/api/invitations/accept",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			);
		},
		meta: {
			errorMessage: "Failed to accept invitation",
		},
	});
}

/**
 * Hook: List Invitations
 *
 * Fetches paginated list of invitations with optional filters.
 * Supports filtering by status and role.
 *
 * @param params - Query parameters for filtering and pagination
 *
 * @example
 * const { data, isLoading, error } = useInvitations({
 *   status: InvitationStatus.PENDING,
 *   limit: 20,
 *   offset: 0
 * })
 */
export function useInvitations(params: ListInvitationsParams = {}) {
	return useQuery<ListInvitationsResponse, InvitationAPIError>({
		queryKey: invitationKeys.list(params),
		queryFn: async () => {
			const searchParams = new URLSearchParams();

			if (params.status) searchParams.append("status", params.status);
			if (params.role) searchParams.append("role", params.role);
			if (params.limit) searchParams.append("limit", params.limit.toString());
			if (params.offset)
				searchParams.append("offset", params.offset.toString());

			const queryString = searchParams.toString();
			const url = `/api/invitations${queryString ? `?${queryString}` : ""}`;

			return fetchWithAuth<ListInvitationsResponse>(url);
		},
		staleTime: 30000, // Consider data fresh for 30 seconds
		meta: {
			errorMessage: "Failed to fetch invitations",
		},
	});
}

/**
 * Hook: Cancel Invitation
 *
 * Cancels a pending invitation. Only admins can cancel invitations.
 * Changes invitation status to CANCELLED.
 *
 * @example
 * const { mutate, isPending, error } = useCancelInvitation()
 * mutate({ invitationId: 'uuid-here' })
 */
export function useCancelInvitation() {
	const queryClient = useQueryClient();

	return useMutation<
		CancelInvitationResponse,
		InvitationAPIError,
		CancelInvitationRequest
	>({
		mutationFn: async (data: CancelInvitationRequest) => {
			return fetchWithAuth<CancelInvitationResponse>(
				`/api/invitations/${data.invitationId}/cancel`,
				{
					method: "DELETE",
				},
			);
		},
		onSuccess: () => {
			// Invalidate invitation lists to refetch with updated status
			queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
			queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
		},
		meta: {
			errorMessage: "Failed to cancel invitation",
		},
	});
}

/**
 * Hook: Resend Invitation
 *
 * Creates a new invitation for the same email address.
 * This is effectively a new invitation with a new token.
 *
 * @example
 * const { mutate, isPending, error } = useResendInvitation()
 * mutate({
 *   emails: ['user@example.com'],
 *   role: UserRole.USER
 * })
 */
export function useResendInvitation() {
	const queryClient = useQueryClient();

	return useMutation<
		SendInvitationsResponse,
		InvitationAPIError,
		SendInvitationsRequest
	>({
		mutationFn: async (data: SendInvitationsRequest) => {
			return fetchWithAuth<SendInvitationsResponse>(
				"/api/invitations/send",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
			queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
		},
		meta: {
			errorMessage: "Failed to resend invitation",
		},
	});
}
