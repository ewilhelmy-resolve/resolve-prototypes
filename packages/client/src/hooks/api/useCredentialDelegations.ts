/**
 * Credential Delegation API Hooks
 *
 * TanStack Query hooks for credential delegation (magic link) flow.
 * Public endpoints for IT admins to submit ITSM credentials.
 */

import { useMutation, useQuery } from "@tanstack/react-query";

/**
 * ITSM system types
 */
export type ItsmSystemType = "servicenow" | "jira" | "confluence";

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
