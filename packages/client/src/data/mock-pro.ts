/**
 * Mock data for Pro Agent Builder
 */

import type {
	MCPSkill,
	ProAgent,
	ProDashboardStats,
	ProWorkflow,
} from "@/types/pro";

export const MOCK_MCP_SKILLS: MCPSkill[] = [
	{
		id: "skill-1",
		name: "Password Reset Service",
		description: "Resets user passwords with optional force reset",
		endpoint: "https://mcp.internal/skills/password-reset",
		authType: "bearer",
		variables: [
			{
				name: "user_id",
				type: "string",
				required: true,
				description: "Target user identifier",
			},
			{
				name: "tenant",
				type: "string",
				required: false,
				description: "Tenant scope for multi-tenant environments",
			},
			{
				name: "force_reset",
				type: "boolean",
				required: false,
				description: "Force immediate password reset",
				defaultValue: "false",
			},
		],
		createdAt: "2025-08-10T14:00:00Z",
		updatedAt: "2026-01-15T09:30:00Z",
	},
	{
		id: "skill-2",
		name: "MFA Validation",
		description: "Validates multi-factor authentication codes",
		endpoint: "https://mcp.internal/skills/mfa-check",
		authType: "bearer",
		variables: [
			{
				name: "user_id",
				type: "string",
				required: true,
				description: "User to validate MFA for",
			},
			{
				name: "mfa_code",
				type: "string",
				required: true,
				description: "MFA code to verify",
			},
		],
		createdAt: "2025-08-12T10:00:00Z",
		updatedAt: "2026-01-18T11:00:00Z",
	},
	{
		id: "skill-3",
		name: "Active Directory Lookup",
		description: "Looks up user information in Active Directory",
		endpoint: "https://mcp.internal/skills/ad-lookup",
		authType: "api_key",
		variables: [
			{
				name: "username",
				type: "string",
				required: true,
				description: "AD username to look up",
			},
			{
				name: "domain",
				type: "string",
				required: false,
				description: "AD domain to search",
				defaultValue: "corp.internal",
			},
		],
		createdAt: "2025-09-01T08:00:00Z",
		updatedAt: "2026-01-20T14:00:00Z",
	},
	{
		id: "skill-4",
		name: "Email Sender",
		description: "Sends emails via the internal mail service",
		endpoint: "https://mcp.internal/skills/email-send",
		authType: "bearer",
		variables: [
			{
				name: "to",
				type: "string",
				required: true,
				description: "Recipient email address",
			},
			{
				name: "subject",
				type: "string",
				required: true,
				description: "Email subject line",
			},
			{
				name: "body",
				type: "string",
				required: true,
				description: "Email body content",
			},
			{
				name: "cc",
				type: "string",
				required: false,
				description: "CC recipients (comma-separated)",
			},
		],
		createdAt: "2025-09-15T12:00:00Z",
		updatedAt: "2026-01-22T16:00:00Z",
	},
	{
		id: "skill-5",
		name: "Device Inventory",
		description: "Queries device inventory and provisioning status",
		endpoint: "https://mcp.internal/skills/device-inventory",
		authType: "api_key",
		variables: [
			{
				name: "device_id",
				type: "string",
				required: false,
				description: "Specific device identifier",
			},
			{
				name: "user_id",
				type: "string",
				required: false,
				description: "Filter devices by assigned user",
			},
			{
				name: "status",
				type: "string",
				required: false,
				description: "Filter by device status",
			},
		],
		createdAt: "2025-10-01T09:00:00Z",
		updatedAt: "2026-01-25T10:00:00Z",
	},
	{
		id: "skill-6",
		name: "Audit Logger",
		description: "Logs actions to the central audit trail",
		endpoint: "https://mcp.internal/skills/audit-log",
		authType: "none",
		variables: [
			{
				name: "action",
				type: "string",
				required: true,
				description: "Action performed",
			},
			{
				name: "actor_id",
				type: "string",
				required: true,
				description: "User who performed the action",
			},
			{
				name: "resource",
				type: "string",
				required: true,
				description: "Resource acted upon",
			},
			{
				name: "metadata",
				type: "object",
				required: false,
				description: "Additional context for the audit entry",
			},
		],
		createdAt: "2025-10-10T07:00:00Z",
		updatedAt: "2026-02-01T08:00:00Z",
	},
];

export const MOCK_PRO_WORKFLOWS: ProWorkflow[] = [
	{
		id: "pw-1",
		name: "Password Reset Flow",
		description: "Validates user, resets password, sends notification",
	},
	{
		id: "pw-2",
		name: "MFA Validation Flow",
		description: "Verifies MFA code, updates auth status",
	},
	{
		id: "pw-3",
		name: "Device Setup Flow",
		description: "Provisions device, assigns to user, logs audit",
	},
];

export const MOCK_PRO_AGENTS: ProAgent[] = [
	{
		id: "agent-1",
		name: "Password Reset",
		description: "Handles password reset requests end-to-end",
		endpointSlug: "password-reset",
		workflowId: "pw-1",
		skillIds: ["skill-1", "skill-3", "skill-6"],
		status: "active",
		apiKey: "pk_live_abc123",
		createdAt: "2025-11-01T10:00:00Z",
		updatedAt: "2026-01-28T15:00:00Z",
	},
	{
		id: "agent-2",
		name: "MFA Validation",
		description: "Validates multi-factor authentication for users",
		endpointSlug: "mfa-validation",
		workflowId: "pw-2",
		skillIds: ["skill-2", "skill-6"],
		status: "active",
		apiKey: "pk_live_def456",
		createdAt: "2025-11-10T08:00:00Z",
		updatedAt: "2026-01-30T12:00:00Z",
	},
	{
		id: "agent-3",
		name: "Device Provisioning",
		description: "Provisions and assigns devices to users",
		endpointSlug: "device-provisioning",
		workflowId: "pw-3",
		skillIds: ["skill-5", "skill-3", "skill-6"],
		status: "active",
		apiKey: "pk_live_ghi789",
		createdAt: "2025-12-01T09:00:00Z",
		updatedAt: "2026-02-01T11:00:00Z",
	},
	{
		id: "agent-4",
		name: "Email Routing",
		description: "Routes and sends emails based on AD lookups",
		endpointSlug: "email-routing",
		workflowId: null,
		skillIds: ["skill-4", "skill-3"],
		status: "draft",
		createdAt: "2026-01-15T14:00:00Z",
		updatedAt: "2026-02-10T09:00:00Z",
	},
];

export const MOCK_PRO_DASHBOARD_STATS: ProDashboardStats = {
	totalAgents: 4,
	totalSkills: 6,
	activeAgents: 3,
	totalApiCalls: 1247,
};

/**
 * Scoped skill access by tenant
 */
export const SCOPED_SKILLS: Record<string, string[]> = {
	telecoms: ["skill-1", "skill-2", "skill-3", "skill-6"],
	enterprise: [
		"skill-1",
		"skill-2",
		"skill-3",
		"skill-4",
		"skill-5",
		"skill-6",
	],
};
