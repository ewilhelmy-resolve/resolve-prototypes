import type {
	DataSourceConnection,
	DataSourceLastSyncStatus,
	DataSourceStatus,
} from "@/types/dataSource";

// UI-friendly status type
export type Status =
	| "Not connected"
	| "Connected"
	| "Syncing"
	| "Verifying"
	| "Cancelled"
	| "Error";

export const STATUS = {
	NOT_CONNECTED: "Not connected" as Status,
	CONNECTED: "Connected" as Status,
	SYNCING: "Syncing" as Status,
	VERIFYING: "Verifying" as Status,
	CANCELLED: "Cancelled" as Status,
	ERROR: "Error" as Status,
};

// UI representation of a connection source (merged backend + UI metadata)
export interface ConnectionSource {
	id: string; // UUID from backend
	type: string; // 'confluence', 'servicenow', etc.
	title: string; // UI-friendly title
	status: Status; // UI-friendly status
	lastSync?: string; // Formatted relative time
	description?: string; // Optional description
	badges: string[]; // Dynamic badges from settings
	settings?: Record<string, any>; // Settings from backend
	backendData?: DataSourceConnection; // Full backend data for detail view
}

// Source type constants (kept for backward compatibility)
export const SOURCE_IDS = [
	"confluence",
	"sharepoint",
	"servicenow",
	"websearch",
] as const;

export const SOURCES = {
	CONFLUENCE: "confluence",
	SHAREPOINT: "sharepoint",
	SERVICENOW: "servicenow",
	WEB_SEARCH: "websearch",
} as const;

export type SourceId = (typeof SOURCES)[keyof typeof SOURCES];

// Knowledge Sources - sync KB articles
export const KNOWLEDGE_SOURCE_TYPES = [
	"confluence",
	"sharepoint",
	"servicenow",
	"websearch",
] as const;

// ITSM Sources - sync tickets for autopilot
export const ITSM_SOURCE_TYPES = ["servicenow", "jira"] as const;

// Display order for each section
export const KNOWLEDGE_SOURCES_ORDER = [
	"confluence",
	"sharepoint",
	"servicenow",
	"websearch",
];
export const ITSM_SOURCES_ORDER = ["servicenow", "jira"];

// Static metadata for each source type (icons, titles, descriptions)
export const SOURCE_METADATA: Record<
	string,
	{
		title: string;
		description?: string;
	}
> = {
	confluence: {
		title: "Confluence",
	},
	servicenow: {
		title: "ServiceNow",
	},
	sharepoint: {
		title: "SharePoint",
	},
	websearch: {
		title: "Web Search (LGA)",
		description:
			"Use web results to supplement answers when knowledge isn't found.",
	},
	jira: {
		title: "Jira",
		description: "Import tickets from Jira for autopilot clustering.",
	},
};

/**
 * Map backend status to UI-friendly display status
 *
 * @param status - Current backend status ('idle', 'verifying', 'syncing')
 * @param last_sync_status - Last sync result ('completed', 'failed', null)
 * @param enabled - Whether connection is enabled
 * @param last_verification_at - When credentials were last verified (null = never configured)
 * @param last_verification_error - Last verification error message (null = no error)
 * @returns UI-friendly status string
 */
export function getDisplayStatus(
	status: DataSourceStatus,
	last_sync_status: DataSourceLastSyncStatus,
	enabled: boolean,
	last_verification_at: string | null,
	last_verification_error: string | null = null,
): Status {
	// Check active statuses first (verifying/syncing take precedence)
	if (status === "verifying") {
		return STATUS.VERIFYING;
	}

	if (status === "syncing") {
		return STATUS.SYNCING;
	}

	// Not configured yet (never verified)
	if (!last_verification_at) {
		return STATUS.NOT_CONNECTED;
	}

	// Check for verification failure (derived state)
	if (last_verification_error) {
		return STATUS.ERROR;
	}

	// Idle - check last sync result
	if (status === "idle") {
		if (!enabled) {
			return STATUS.NOT_CONNECTED;
		}

		if (last_sync_status === "failed") {
			return STATUS.ERROR;
		}

		if (last_sync_status === "completed") {
			return STATUS.CONNECTED;
		}

		// Never synced but verified (configured)
		return STATUS.CONNECTED;
	}

	return STATUS.NOT_CONNECTED;
}

/**
 * Extract dynamic badges from settings
 * Confluence: Shows spaces from settings.spaces (comma-separated string)
 * ServiceNow/SharePoint: TODO - define when backend settings structure is known
 *
 * @param source - Backend data source connection
 * @returns Array of badge strings
 */
export function getConfigBadges(source: DataSourceConnection): string[] {
	const badges: string[] = [];

	switch (source.type) {
		case "confluence":
			// Confluence: Show comma-separated spaces from settings
			if (source.settings?.spaces) {
				const spaces =
					typeof source.settings.spaces === "string"
						? source.settings.spaces
								.split(",")
								.map((s) => s.trim())
								.filter(Boolean)
						: Array.isArray(source.settings.spaces)
							? source.settings.spaces
							: [];
				badges.push(...spaces);
			}
			break;

		case "servicenow":
			// ServiceNow: TODO - define when backend config structure is known
			// Possible: tables, categories, etc.
			break;

		case "sharepoint":
			// SharePoint: TODO - define when backend config structure is known
			// Possible: sites, document libraries, etc.
			break;

		case "websearch":
			// WebSearch: No dynamic badges needed
			break;
	}

	return badges;
}

/**
 * Format timestamp as relative time
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted relative time (e.g., "2 minutes ago", "Just now")
 */
export function formatRelativeTime(timestamp: string | null): string {
	if (!timestamp) return "—";

	const now = new Date();
	const date = new Date(timestamp);
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (seconds < 60) return "Just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
	if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

	return date.toLocaleDateString();
}

/**
 * Merge backend data with UI metadata
 * Converts DataSourceConnection (backend) to ConnectionSource (UI)
 *
 * @param source - Backend data source connection
 * @returns UI connection source with merged metadata
 */
export function mapDataSourceToUI(
	source: DataSourceConnection,
): ConnectionSource {
	const metadata = SOURCE_METADATA[source.type] || { title: source.type };

	return {
		id: source.id, // Use backend UUID
		type: source.type,
		title: metadata.title,
		status: getDisplayStatus(
			source.status,
			source.last_sync_status,
			source.enabled,
			source.last_verification_at,
			source.last_verification_error,
		),
		lastSync: formatRelativeTime(source.last_sync_at),
		description: metadata.description,
		badges: getConfigBadges(source), // Dynamic badges from settings
		settings: source.settings,
		backendData: source, // Keep full backend data for detail view
	};
}
