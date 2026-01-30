import keycloak from "./keycloak";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public data?: any,
	) {
		super(message);
		this.name = "ApiError";
	}
}

interface ApiRequestOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	headers?: Record<string, string>;
	body?: any;
}

async function apiRequest<T>(
	endpoint: string,
	options: ApiRequestOptions = {},
): Promise<T> {
	const { method = "GET", headers = {}, body } = options;

	const config: RequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		credentials: "include", // Include cookies for session-based auth
	};

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

	if (body && method !== "GET") {
		config.body = JSON.stringify(body);
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		// Special handling for 401 to trigger re-authentication
		if (response.status === 401) {
			console.error("API request returned 401. Session may have expired.");
		}
		// Handle 502 - backend is down, redirect to login
		if (response.status === 502) {
			console.error("API request returned 502. Backend is down.");
			keycloak.logout();
		}
		throw new ApiError(
			response.status,
			errorData.error ||
				errorData.message ||
				`HTTP ${response.status}: ${response.statusText}`,
			errorData,
		);
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

// Conversation API
export const conversationApi = {
	getConversations: () =>
		apiRequest<{ conversations: any[] }>("/api/conversations"),

	createConversation: (data: { title: string }) =>
		apiRequest<{ conversation: any }>("/api/conversations", {
			method: "POST",
			body: data,
		}),

	getConversationMessages: (
		conversationId: string,
		params?: { limit?: number; before?: string },
	) => {
		// Filter out undefined and null values to avoid sending them as strings
		const cleanParams = params
			? Object.entries(params)
					.filter(
						([_, value]) =>
							value !== undefined && value !== null && value !== "",
					)
					.reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {})
			: {};

		const queryString =
			Object.keys(cleanParams).length > 0
				? `?${new URLSearchParams(cleanParams).toString()}`
				: "";

		return apiRequest<{
			messages: any[];
			hasMore: boolean;
			nextCursor: string | null;
		}>(`/api/conversations/${conversationId}/messages${queryString}`);
	},

	sendMessage: (
		conversationId: string,
		data: { content: string; metadata?: Record<string, string> },
	) =>
		apiRequest<{ message: any }>(
			`/api/conversations/${conversationId}/messages`,
			{
				method: "POST",
				body: data,
			},
		),

	updateConversation: (conversationId: string, data: { title: string }) =>
		apiRequest<{ conversation: any }>(`/api/conversations/${conversationId}`, {
			method: "PATCH",
			body: data,
		}),

	deleteConversation: (conversationId: string) =>
		apiRequest<{ deleted: boolean }>(`/api/conversations/${conversationId}`, {
			method: "DELETE",
		}),

	getMessage: (messageId: string) =>
		apiRequest<{ message: any }>(`/api/messages/${messageId}`),
};

// Organization API
export const organizationApi = {
	getCurrentOrganization: () =>
		apiRequest<{
			organization: {
				id: string;
				name: string;
				user_role: string;
				member_count: number;
				created_at: string;
			};
		}>("/api/organizations/current"),

	updateOrganization: (organizationId: string, data: { name: string }) =>
		apiRequest<{
			success: boolean;
			organization: {
				id: string;
				name: string;
				created_at: string;
				updated_at: string;
			};
		}>(`/api/organizations/${organizationId}`, {
			method: "PATCH",
			body: data,
		}),

	switchOrganization: (organizationId: string) =>
		apiRequest<{ success: boolean }>("/api/organizations/switch", {
			method: "POST",
			body: { organizationId },
		}),
};

// File API
export const fileApi = {
	// Upload file directly to database
	uploadFile: async (file: File) => {
		const formData = new FormData();
		formData.append("file", file);
		// Send filename separately with explicit UTF-8 encoding to avoid multer encoding issues
		formData.append("filename", file.name);

		const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
			method: "POST",
			credentials: "include",
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new ApiError(
				response.status,
				errorData.error || `Upload failed: ${response.statusText}`,
				errorData,
			);
		}

		return response.json();
	},

	// Create text content
	createContent: (data: {
		content: string;
		filename: string;
		metadata?: any;
	}) =>
		apiRequest<{ document: any }>("/api/files/content", {
			method: "POST",
			body: data,
		}),

	// Download file directly from database
	downloadFile: async (documentId: string) => {
		const response = await fetch(
			`${API_BASE_URL}/api/files/${documentId}/download`,
			{
				method: "GET",
				credentials: "include",
			},
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new ApiError(
				response.status,
				errorData.error || `Download failed: ${response.statusText}`,
				errorData,
			);
		}

		return response;
	},

	// List documents
	listDocuments: (
		limit: number = 250,
		offset: number = 0,
		sortBy: string = "created_at",
		sortOrder: string = "desc",
		search?: string,
		status?: string,
		source?: string,
	) => {
		const params = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString(),
			sort_by: sortBy,
			sort_order: sortOrder,
		});

		// Add optional filter parameters
		if (search && search.trim()) {
			params.append("search", search.trim());
		}
		if (status && status.toLowerCase() !== "all") {
			params.append("status", status.toLowerCase());
		}
		if (source && source.toLowerCase() !== "all") {
			params.append("source", source);
		}

		return apiRequest<{
			documents: any[];
			total: number;
			limit: number;
			offset: number;
		}>(`/api/files?${params.toString()}`);
	},

	// Delete document
	deleteDocument: (documentId: string) =>
		apiRequest<{ deleted: boolean }>(`/api/files/${documentId}`, {
			method: "DELETE",
		}),

	// Reprocess document (trigger processing workflow)
	reprocessDocument: (documentId: string) =>
		apiRequest<{ success: boolean; message: string; document_id: string }>(
			`/api/files/${documentId}/process`,
			{
				method: "POST",
				body: { enable_processing: true },
			},
		),

	// Get document metadata (for citations - includes processed content from metadata.content)
	getDocumentMetadata: (documentId: string) =>
		apiRequest<{
			id: string;
			filename: string;
			file_size: number;
			mime_type: string;
			created_at: string;
			updated_at: string;
			metadata: {
				content?: string;
				[key: string]: any;
			};
		}>(`/api/files/${documentId}/metadata`, {
			method: "GET",
		}),
};

// Data Sources API
export const dataSourcesApi = {
	// List all data sources
	list: () =>
		apiRequest<{ data: import("../types/dataSource").DataSourceConnection[] }>(
			"/api/data-sources",
		),

	// Get single data source by ID
	get: (id: string) =>
		apiRequest<{ data: import("../types/dataSource").DataSourceConnection }>(
			`/api/data-sources/${id}`,
		),

	// Seed default data sources (idempotent)
	seed: () =>
		apiRequest<import("../types/dataSource").SeedDataSourcesResponse>(
			"/api/data-sources/seed",
			{
				method: "POST",
			},
		),

	// Update data source
	update: (
		id: string,
		data: import("../types/dataSource").UpdateDataSourceRequest,
	) =>
		apiRequest<{ data: import("../types/dataSource").DataSourceConnection }>(
			`/api/data-sources/${id}`,
			{
				method: "PUT",
				body: data,
			},
		),

	// Verify credentials (async - result via SSE)
	verify: (
		id: string,
		payload: import("../types/dataSource").VerifyDataSourceRequest,
	) =>
		apiRequest<import("../types/dataSource").VerifyDataSourceResponse>(
			`/api/data-sources/${id}/verify`,
			{
				method: "POST",
				body: payload,
			},
		),

	// Trigger sync
	sync: (id: string) =>
		apiRequest<import("../types/dataSource").TriggerSyncResponse>(
			`/api/data-sources/${id}/sync`,
			{
				method: "POST",
			},
		),

	// Cancel sync
	cancelSync: (id: string) =>
		apiRequest<{ success: boolean; message: string }>(
			`/api/data-sources/${id}/cancel-sync`,
			{
				method: "POST",
			},
		),

	// Cancel ingestion (ticket sync)
	cancelIngestion: (id: string) =>
		apiRequest<{ success: boolean; message: string }>(
			`/api/data-sources/${id}/cancel-ingestion`,
			{
				method: "POST",
			},
		),

	// Sync tickets (ITSM Autopilot)
	syncTickets: (id: string, params: { time_range_days: number }) =>
		apiRequest<import("../types/dataSource").SyncTicketsResponse>(
			`/api/data-sources/${id}/sync-tickets`,
			{
				method: "POST",
				body: params,
			},
		),

	// Get latest ingestion run (ITSM Autopilot)
	getLatestIngestionRun: (id: string) =>
		apiRequest<import("../types/dataSource").LatestIngestionRunResponse>(
			`/api/data-sources/${id}/ingestion-runs/latest`,
		),
};

// Member API
export const memberApi = {
	/**
	 * List all members in the organization
	 */
	listMembers: async (
		params?: import("../types/member").MemberListParams,
	): Promise<import("../types/member").MemberListResponse> => {
		const searchParams = new URLSearchParams();

		if (params?.role) searchParams.append("role", params.role);
		if (params?.status) searchParams.append("status", params.status);
		if (params?.search) searchParams.append("search", params.search);
		if (params?.limit) searchParams.append("limit", params.limit.toString());
		if (params?.offset) searchParams.append("offset", params.offset.toString());
		if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
		if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

		const queryString = searchParams.toString();
		const url = `/api/organizations/members${queryString ? `?${queryString}` : ""}`;

		return apiRequest<import("../types/member").MemberListResponse>(url, {
			method: "GET",
		});
	},

	/**
	 * Get detailed information about a specific member
	 */
	getMember: async (
		userId: string,
	): Promise<import("../types/member").MemberResponse> => {
		return apiRequest<import("../types/member").MemberResponse>(
			`/api/organizations/members/${userId}`,
			{
				method: "GET",
			},
		);
	},

	/**
	 * Update a member's role (owner only)
	 */
	updateMemberRole: async (
		userId: string,
		role: import("../types/member").OrganizationRole,
	): Promise<import("../types/member").UpdateMemberResponse> => {
		return apiRequest<import("../types/member").UpdateMemberResponse>(
			`/api/organizations/members/${userId}/role`,
			{
				method: "PATCH",
				body: { role },
			},
		);
	},

	/**
	 * Update a member's active status (owner/admin with restrictions)
	 */
	updateMemberStatus: async (
		userId: string,
		isActive: boolean,
	): Promise<import("../types/member").UpdateMemberResponse> => {
		return apiRequest<import("../types/member").UpdateMemberResponse>(
			`/api/organizations/members/${userId}/status`,
			{
				method: "PATCH",
				body: { isActive },
			},
		);
	},

	/**
	 * Remove a member from the organization (soft delete)
	 */
	removeMember: async (
		userId: string,
	): Promise<import("../types/member").RemoveMemberResponse> => {
		return apiRequest<import("../types/member").RemoveMemberResponse>(
			`/api/organizations/members/${userId}`,
			{
				method: "DELETE",
			},
		);
	},

	/**
	 * Permanently delete a member (hard delete with Keycloak cleanup)
	 * Owner only - deletes user from database, Keycloak, and external storage
	 * If owner is being deleted and they're the last/only member, deletes entire organization
	 */
	deleteMemberPermanent: async (
		userId: string,
		reason?: string,
	): Promise<import("../types/member").RemoveMemberResponse> => {
		const searchParams = new URLSearchParams();
		if (reason) searchParams.append("reason", reason);

		const queryString = searchParams.toString();
		const url = `/api/organizations/members/${userId}/permanent${queryString ? `?${queryString}` : ""}`;

		return apiRequest<import("../types/member").RemoveMemberResponse>(url, {
			method: "DELETE",
		});
	},

	/**
	 * Delete own account (hard delete with Keycloak cleanup)
	 * If owner and last/sole member → deletes entire organization and all members
	 * ⚠️ User will be logged out after successful deletion
	 */
	deleteOwnAccount: async (
		reason?: string,
	): Promise<import("../types/member").RemoveMemberResponse> => {
		const searchParams = new URLSearchParams();
		if (reason) searchParams.append("reason", reason);

		const queryString = searchParams.toString();
		const url = `/api/organizations/members/self/permanent${queryString ? `?${queryString}` : ""}`;

		return apiRequest<import("../types/member").RemoveMemberResponse>(url, {
			method: "DELETE",
		});
	},

	/**
	 * Update a member's profile (firstName, lastName) (owner/admin only)
	 */
	updateMemberProfile: async (
		userId: string,
		data: { firstName?: string; lastName?: string },
	): Promise<import("../types/member").UpdateMemberResponse> => {
		return apiRequest<import("../types/member").UpdateMemberResponse>(
			`/api/organizations/members/${userId}/profile`,
			{
				method: "PATCH",
				body: data,
			},
		);
	},
};

// Clusters API
export const clustersApi = {
	// List all clusters for the organization
	list: (params?: import("../types/cluster").ClustersQueryParams) => {
		const searchParams = new URLSearchParams();
		if (params?.sort) searchParams.append("sort", params.sort);
		if (params?.period) searchParams.append("period", params.period);
		if (params?.limit) searchParams.append("limit", params.limit.toString());
		if (params?.cursor) searchParams.append("cursor", params.cursor);
		if (params?.kb_status) searchParams.append("kb_status", params.kb_status);
		if (params?.search) searchParams.append("search", params.search);

		const queryString = searchParams.toString();
		return apiRequest<import("../types/cluster").ClustersResponse>(
			`/api/clusters${queryString ? `?${queryString}` : ""}`,
		);
	},

	// Get cluster details by ID
	getDetails: (clusterId: string) =>
		apiRequest<import("../types/cluster").ClusterDetailsResponse>(
			`/api/clusters/${clusterId}/details`,
		),

	// Get paginated tickets for a cluster
	getTickets: (
		clusterId: string,
		params?: import("../types/cluster").ClusterTicketsQueryParams,
	) => {
		const searchParams = new URLSearchParams();
		if (params?.tab) searchParams.append("tab", params.tab);
		if (params?.cursor) searchParams.append("cursor", params.cursor);
		if (params?.limit) searchParams.append("limit", params.limit.toString());
		if (params?.search) searchParams.append("search", params.search);
		if (params?.sort) searchParams.append("sort", params.sort);
		if (params?.sort_dir) searchParams.append("sort_dir", params.sort_dir);
		if (params?.source) searchParams.append("source", params.source);

		const queryString = searchParams.toString();
		return apiRequest<import("../types/cluster").ClusterTicketsResponse>(
			`/api/clusters/${clusterId}/tickets${queryString ? `?${queryString}` : ""}`,
		);
	},

	// Get KB articles linked to a cluster
	getKbArticles: (clusterId: string) =>
		apiRequest<import("../types/cluster").ClusterKbArticlesResponse>(
			`/api/clusters/${clusterId}/kb-articles`,
		),
};

// Tickets API
export const ticketsApi = {
	// Get a single ticket by ID
	getById: (ticketId: string) =>
		apiRequest<import("../types/cluster").TicketResponse>(
			`/api/tickets/${ticketId}`,
		),
};

// ML Models API
export const mlModelsApi = {
	// Get active model for the organization
	getActive: () =>
		apiRequest<import("../types/mlModel").ActiveModelResponse>(
			"/api/ml-models/active",
		),
};

export { ApiError };
