/**
 * Credential Delegation API Hooks
 *
 * TanStack Query hooks for credential delegation (magic link) flow.
 * Includes both public endpoints (for IT admins) and authenticated endpoints (for owners).
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import keycloak from "@/services/keycloak";

/**
 * ITSM system types
 * Note: 'servicenow_itsm' (not 'servicenow') - KB uses separate connection
 */
export type ItsmSystemType = "servicenow_itsm" | "jira_itsm";

/**
 * Delegation status
 */
export type DelegationStatus =
	| "pending"
	| "verified"
	| "failed"
	| "expired"
	| "cancelled";

/**
 * Token verification response
 */
export interface VerifyDelegationResponse {
	valid: boolean;
	org_name?: string;
	system_type?: ItsmSystemType;
	delegated_by?: string;
	expires_at?: string;
	reason?: "expired" | "not_found";
}

/**
 * ServiceNow credentials
 */
export interface ServiceNowCredentials {
	instance_url: string;
	username: string;
	password: string;
}

/**
 * Jira/Confluence credentials
 */
export interface JiraCredentials {
	instance_url: string;
	email: string;
	api_token: string;
}

export type ItsmCredentials = ServiceNowCredentials | JiraCredentials;

/**
 * Submit credentials request
 */
export interface SubmitCredentialsRequest {
	token: string;
	credentials: ItsmCredentials;
}

/**
 * Submit credentials response
 */
export interface SubmitCredentialsResponse {
	success: boolean;
	message: string;
	delegation_id: string;
	status: DelegationStatus;
}

/**
 * Delegation status response (for polling)
 */
export interface DelegationStatusResponse {
	delegation_id: string;
	status: DelegationStatus;
	itsm_system_type: ItsmSystemType;
	organization_name: string;
	submitted_at: string | null;
	verified_at: string | null;
	error: string | null;
}

/**
 * API error response
 */
export interface CredentialDelegationError {
	error: string;
	message?: string;
}

/**
 * Create delegation request (authenticated)
 */
export interface CreateDelegationRequest {
	admin_email: string;
	itsm_system_type: ItsmSystemType;
}

/**
 * Create delegation response
 */
export interface CreateDelegationResponse {
	delegation_id: string;
	delegation_url: string;
	expires_at: string;
	status: DelegationStatus;
}

/**
 * Query Keys
 */
export const credentialDelegationKeys = {
	all: ["credential-delegations"] as const,
	verify: (token: string) =>
		[...credentialDelegationKeys.all, "verify", token] as const,
	status: (token: string) =>
		[...credentialDelegationKeys.all, "status", token] as const,
};

/**
 * API Base URL
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Public fetch (no auth required)
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
		const error: CredentialDelegationError = await response
			.json()
			.catch(() => ({
				error: `HTTP ${response.status}: ${response.statusText}`,
			}));

		throw error;
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

/**
 * Hook: Verify delegation token
 *
 * Validates token and returns delegation details.
 * PUBLIC endpoint - no authentication required.
 *
 * @param token - Delegation token from URL
 * @param enabled - Whether to run query
 */
export function useVerifyDelegation(token: string, enabled = true) {
	return useQuery<VerifyDelegationResponse, CredentialDelegationError>({
		queryKey: credentialDelegationKeys.verify(token),
		queryFn: async () => {
			return fetchPublic<VerifyDelegationResponse>(
				`/api/credential-delegations/verify/${token}`,
			);
		},
		enabled: enabled && !!token,
		retry: false,
		staleTime: 0,
	});
}

/**
 * Hook: Submit credentials
 *
 * Submits ITSM credentials via delegation token.
 * PUBLIC endpoint - no authentication required.
 */
export function useSubmitCredentials() {
	return useMutation<
		SubmitCredentialsResponse,
		CredentialDelegationError,
		SubmitCredentialsRequest
	>({
		mutationFn: async (data: SubmitCredentialsRequest) => {
			return fetchPublic<SubmitCredentialsResponse>(
				"/api/credential-delegations/submit",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			);
		},
	});
}

/**
 * Hook: Get delegation status (polling)
 *
 * Returns current status of credential verification.
 * PUBLIC endpoint - no authentication required.
 *
 * @param token - Delegation token
 * @param enabled - Whether to run query
 * @param refetchInterval - Polling interval in ms (default: 2000)
 */
export function useDelegationStatus(
	token: string,
	enabled = true,
	refetchInterval: number | false = 2000,
) {
	return useQuery<DelegationStatusResponse, CredentialDelegationError>({
		queryKey: credentialDelegationKeys.status(token),
		queryFn: async () => {
			return fetchPublic<DelegationStatusResponse>(
				`/api/credential-delegations/status/${token}`,
			);
		},
		enabled: enabled && !!token,
		refetchInterval,
		retry: false,
	});
}

/**
 * Authenticated fetch (requires Keycloak session)
 */
async function fetchWithAuth<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	if (keycloak.authenticated && keycloak.token) {
		try {
			await keycloak.updateToken(5);
		} catch (error) {
			console.error("Failed to refresh Keycloak token", error);
			keycloak.logout();
		}
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
		credentials: "include",
	});

	if (!response.ok) {
		const error: CredentialDelegationError = await response
			.json()
			.catch(() => ({
				error: `HTTP ${response.status}: ${response.statusText}`,
			}));

		throw error;
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

/**
 * Hook: Create credential delegation
 *
 * Creates delegation and sends email to IT admin.
 * AUTHENTICATED endpoint - requires owner/admin role.
 */
export function useCreateDelegation() {
	return useMutation<
		CreateDelegationResponse,
		CredentialDelegationError,
		CreateDelegationRequest
	>({
		mutationFn: async (data: CreateDelegationRequest) => {
			return fetchWithAuth<CreateDelegationResponse>(
				"/api/credential-delegations/create",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			);
		},
	});
}
