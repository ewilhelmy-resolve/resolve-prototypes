import type {
	ClusterDetails,
	ClusterKbArticlesResponse,
	ClusterListItem,
	ClustersResponse,
	ClusterTicketsResponse,
	KbArticle,
	Ticket,
} from "@/types/cluster";

export const MOCK_CLUSTERS: ClusterListItem[] = [
	{
		id: "cl-001",
		name: "Email Signature Issues",
		subcluster_name: null,
		kb_status: "FOUND",
		config: { auto_respond: true, auto_populate: true },
		ticket_count: 976,
		needs_response_count: 14,
		created_at: "2025-12-01T10:00:00Z",
		updated_at: "2026-02-20T15:30:00Z",
	},
	{
		id: "cl-002",
		name: "Password Reset Requests",
		subcluster_name: null,
		kb_status: "FOUND",
		config: { auto_respond: true, auto_populate: true },
		ticket_count: 743,
		needs_response_count: 8,
		created_at: "2025-12-01T10:00:00Z",
		updated_at: "2026-02-19T12:00:00Z",
	},
	{
		id: "cl-003",
		name: "Network Connectivity",
		subcluster_name: null,
		kb_status: "FOUND",
		config: { auto_respond: false, auto_populate: true },
		ticket_count: 564,
		needs_response_count: 23,
		created_at: "2025-12-15T08:00:00Z",
		updated_at: "2026-02-21T09:45:00Z",
	},
	{
		id: "cl-004",
		name: "VPN Connection Problems",
		subcluster_name: null,
		kb_status: "FOUND",
		config: { auto_respond: true, auto_populate: false },
		ticket_count: 312,
		needs_response_count: 5,
		created_at: "2026-01-05T14:00:00Z",
		updated_at: "2026-02-18T16:20:00Z",
	},
	{
		id: "cl-005",
		name: "Application Crashes",
		subcluster_name: "Outlook",
		kb_status: "FOUND",
		config: { auto_respond: false, auto_populate: true },
		ticket_count: 121,
		needs_response_count: 5,
		created_at: "2026-01-10T11:00:00Z",
		updated_at: "2026-02-17T13:10:00Z",
	},
	{
		id: "cl-006",
		name: "System Performance Degradation",
		subcluster_name: null,
		kb_status: "GAP",
		config: { auto_respond: false, auto_populate: false },
		ticket_count: 89,
		needs_response_count: 12,
		created_at: "2026-01-20T09:00:00Z",
		updated_at: "2026-02-22T10:00:00Z",
	},
	{
		id: "cl-007",
		name: "MFA Setup Assistance",
		subcluster_name: null,
		kb_status: "GAP",
		config: { auto_respond: false, auto_populate: false },
		ticket_count: 67,
		needs_response_count: 4,
		created_at: "2026-02-01T08:30:00Z",
		updated_at: "2026-02-23T11:00:00Z",
	},
	{
		id: "cl-008",
		name: "Printer Configuration",
		subcluster_name: null,
		kb_status: "PENDING",
		config: { auto_respond: false, auto_populate: false },
		ticket_count: 45,
		needs_response_count: 3,
		created_at: "2026-02-10T07:00:00Z",
		updated_at: "2026-02-24T14:30:00Z",
	},
];

export const MOCK_CLUSTERS_RESPONSE: ClustersResponse = {
	data: MOCK_CLUSTERS,
	pagination: { next_cursor: null, has_more: false },
	totals: {
		total_clusters: MOCK_CLUSTERS.length,
		total_tickets: MOCK_CLUSTERS.reduce((sum, c) => sum + c.ticket_count, 0),
	},
};

/** Build mock ClusterDetails from a ClusterListItem */
function toClusterDetails(item: ClusterListItem): ClusterDetails {
	return {
		id: item.id,
		organization_id: "org-demo-001",
		model_id: "model-demo-001",
		name: item.name,
		subcluster_name: item.subcluster_name,
		config: item.config,
		kb_status: item.kb_status,
		kb_articles_count: item.kb_status === "FOUND" ? 3 : 0,
		ticket_count: item.ticket_count,
		open_count: item.needs_response_count,
		created_at: item.created_at,
		updated_at: item.updated_at,
	};
}

const MOCK_CLUSTER_DETAILS_MAP: Record<string, ClusterDetails> =
	Object.fromEntries(MOCK_CLUSTERS.map((c) => [c.id, toClusterDetails(c)]));

export function getMockClusterDetails(id: string): ClusterDetails | undefined {
	return MOCK_CLUSTER_DETAILS_MAP[id];
}

/** Mock tickets for any cluster */
const MOCK_TICKETS: Ticket[] = [
	{
		id: "tkt-001",
		organization_id: "org-demo-001",
		cluster_id: null,
		data_source_connection_id: null,
		external_id: "INC-4021",
		subject: "Cannot access shared drive after password reset",
		description:
			"User reports losing access to network shares after changing password yesterday.",
		external_status: "Open",
		cluster_text: null,
		rita_status: "NEEDS_RESPONSE",
		source_metadata: {},
		requester: "jsmith@acme.com",
		assigned_to: "helpdesk@acme.com",
		priority: "High",
		created_at: "2026-02-20T09:15:00Z",
		updated_at: "2026-02-20T09:15:00Z",
	},
	{
		id: "tkt-002",
		organization_id: "org-demo-001",
		cluster_id: null,
		data_source_connection_id: null,
		external_id: "INC-4018",
		subject: "Outlook keeps crashing on startup",
		description:
			"Outlook crashes immediately after launch. Tried safe mode, still crashes.",
		external_status: "Open",
		cluster_text: null,
		rita_status: "NEEDS_RESPONSE",
		source_metadata: {},
		requester: "mjones@acme.com",
		assigned_to: "helpdesk@acme.com",
		priority: "Medium",
		created_at: "2026-02-19T14:30:00Z",
		updated_at: "2026-02-19T14:30:00Z",
	},
	{
		id: "tkt-003",
		organization_id: "org-demo-001",
		cluster_id: null,
		data_source_connection_id: null,
		external_id: "INC-3995",
		subject: "VPN disconnects every 10 minutes",
		description: "VPN connection drops frequently, requiring manual reconnect.",
		external_status: "Resolved",
		cluster_text: null,
		rita_status: "COMPLETED",
		source_metadata: {},
		requester: "alee@acme.com",
		assigned_to: "netops@acme.com",
		priority: "Medium",
		created_at: "2026-02-18T11:00:00Z",
		updated_at: "2026-02-19T16:00:00Z",
	},
];

export function getMockClusterTickets(
	_id: string,
	tab?: "needs_response" | "completed",
): ClusterTicketsResponse {
	const filtered = tab
		? MOCK_TICKETS.filter((t) =>
				tab === "needs_response"
					? t.rita_status === "NEEDS_RESPONSE"
					: t.rita_status === "COMPLETED",
			)
		: MOCK_TICKETS;
	return { data: filtered, pagination: { next_cursor: null, has_more: false } };
}

/** Mock KB articles */
const MOCK_KB_ARTICLES: KbArticle[] = [
	{
		id: "kb-001",
		filename: "password-reset-guide.pdf",
		file_size: 245000,
		mime_type: "application/pdf",
		status: "processed",
		created_at: "2026-01-15T10:00:00Z",
		updated_at: "2026-01-15T10:00:00Z",
	},
	{
		id: "kb-002",
		filename: "vpn-troubleshooting.pdf",
		file_size: 180000,
		mime_type: "application/pdf",
		status: "processed",
		created_at: "2026-01-20T08:00:00Z",
		updated_at: "2026-01-20T08:00:00Z",
	},
	{
		id: "kb-003",
		filename: "network-connectivity-faq.pdf",
		file_size: 120000,
		mime_type: "application/pdf",
		status: "processed",
		created_at: "2026-02-01T12:00:00Z",
		updated_at: "2026-02-01T12:00:00Z",
	},
];

export function getMockClusterKbArticles(
	id: string,
): ClusterKbArticlesResponse {
	const cluster = MOCK_CLUSTER_DETAILS_MAP[id];
	const articles = cluster?.kb_status === "FOUND" ? MOCK_KB_ARTICLES : [];
	return { data: articles };
}
