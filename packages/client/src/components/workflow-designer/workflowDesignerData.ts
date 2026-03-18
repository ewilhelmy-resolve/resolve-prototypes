import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { ToolboxItem, WorkflowTemplate } from "./workflowDesignerTypes";

// Default nodes for Azure AD Offboarding demo workflow
export const DEFAULT_NODES: Node[] = [
	{
		id: "start",
		type: "start",
		position: { x: 300, y: 0 },
		data: {
			activityType: "split",
			label: "START",
			subtitle: "",
			icon: "play",
			enabled: true,
			config: { triggerType: "manual" },
		},
	},
	{
		id: "split-1",
		type: "activity",
		position: { x: 250, y: 100 },
		data: {
			activityType: "split",
			label: "Split",
			subtitle: "Split full name into parts",
			icon: "split",
			enabled: true,
			config: { delimiter: " ", inputVariable: "fullName" },
		},
	},
	{
		id: "user-name-1",
		type: "activity",
		position: { x: 250, y: 200 },
		data: {
			activityType: "user_name",
			label: "User Name",
			subtitle: "Extract user name from input",
			icon: "user_name",
			enabled: true,
			config: {},
		},
	},
	{
		id: "trim-name-1",
		type: "activity",
		position: { x: 250, y: 300 },
		data: {
			activityType: "trim_name",
			label: "Trim Name",
			subtitle: "Remove extra whitespace",
			icon: "trim_name",
			enabled: true,
			config: {},
		},
	},
	{
		id: "azure-user-1",
		type: "activity",
		position: { x: 250, y: 400 },
		data: {
			activityType: "azure_user",
			label: "Azure AD User",
			subtitle: "Fetch user from Azure AD",
			icon: "azure_user",
			enabled: true,
			config: {
				endPoint: "https://graph.microsoft.com/v1.0/users",
				tenantId: "",
				clientId: "",
				clientSecret: "",
				scope: "https://graph.microsoft.com/.default",
			},
		},
	},
	{
		id: "filter-1",
		type: "activity",
		position: { x: 250, y: 500 },
		data: {
			activityType: "filter_results",
			label: "Filter Results",
			subtitle: "Filter matching records",
			icon: "filter_results",
			enabled: true,
			config: { filterExpression: "accountEnabled eq true" },
		},
	},
	{
		id: "display-name-1",
		type: "activity",
		position: { x: 250, y: 600 },
		data: {
			activityType: "display_name",
			label: "Display Name",
			subtitle: "Get display name field",
			icon: "display_name",
			enabled: true,
			config: {},
		},
	},
	{
		id: "row-count-1",
		type: "activity",
		position: { x: 250, y: 700 },
		data: {
			activityType: "row_count",
			label: "Row Count",
			subtitle: "Count result rows",
			icon: "row_count",
			enabled: true,
			config: {},
		},
	},
	{
		id: "if-else-1",
		type: "branch",
		position: { x: 250, y: 810 },
		data: {
			activityType: "if_else",
			label: "If / Else",
			subtitle: "Branch on row count > 0",
			icon: "if_else",
			enabled: true,
			config: { condition: "rowCount > 0" },
		},
	},
	{
		id: "disable-account",
		type: "activity",
		position: { x: 100, y: 950 },
		data: {
			activityType: "azure_user",
			label: "Disable Account",
			subtitle: "Disable the AD account",
			icon: "azure_user",
			enabled: true,
			config: {},
		},
	},
	{
		id: "log-not-found",
		type: "activity",
		position: { x: 400, y: 950 },
		data: {
			activityType: "display_name",
			label: "Log Not Found",
			subtitle: "Log user not found error",
			icon: "display_name",
			enabled: true,
			config: {},
		},
	},
];

// Default edges connecting the demo workflow
export const DEFAULT_EDGES: Edge[] = [
	{
		id: "e-start-split",
		source: "start",
		target: "split-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-split-user",
		source: "split-1",
		target: "user-name-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-user-trim",
		source: "user-name-1",
		target: "trim-name-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-trim-azure",
		source: "trim-name-1",
		target: "azure-user-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-azure-filter",
		source: "azure-user-1",
		target: "filter-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-filter-display",
		source: "filter-1",
		target: "display-name-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-display-rowcount",
		source: "display-name-1",
		target: "row-count-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-rowcount-ifelse",
		source: "row-count-1",
		target: "if-else-1",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#94a3b8", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
	},
	{
		id: "e-ifelse-disable",
		source: "if-else-1",
		sourceHandle: "true",
		target: "disable-account",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#22c55e", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
		label: "True",
	},
	{
		id: "e-ifelse-log",
		source: "if-else-1",
		sourceHandle: "false",
		target: "log-not-found",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#ef4444", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
		label: "False",
	},
];

// Google Password Reset workflow nodes
export const GOOGLE_PASSWORD_RESET_NODES: Node[] = [
	{
		id: "start",
		type: "start",
		position: { x: 300, y: 0 },
		data: {
			activityType: "split",
			label: "START",
			subtitle: "",
			icon: "play",
			enabled: true,
			config: { triggerType: "manual" },
		},
	},
	{
		id: "gpr-parse-input",
		type: "activity",
		position: { x: 250, y: 100 },
		data: {
			activityType: "split",
			label: "Parse Ticket Input",
			subtitle: "Extract email from request",
			icon: "split",
			enabled: true,
			config: { delimiter: "|", inputVariable: "ticketBody" },
		},
	},
	{
		id: "gpr-trim-email",
		type: "activity",
		position: { x: 250, y: 200 },
		data: {
			activityType: "trim_name",
			label: "Trim Email",
			subtitle: "Clean up email address",
			icon: "trim_name",
			enabled: true,
			config: {},
		},
	},
	{
		id: "gpr-lookup-user",
		type: "activity",
		position: { x: 250, y: 300 },
		data: {
			activityType: "google_user",
			label: "Google Workspace Lookup",
			subtitle: "Find user in Google Admin",
			icon: "google_user",
			enabled: true,
			config: {
				endPoint: "https://admin.googleapis.com/admin/directory/v1/users",
				serviceAccount: "admin-sa@company.iam.gserviceaccount.com",
				domain: "company.com",
			},
		},
	},
	{
		id: "gpr-check-user",
		type: "branch",
		position: { x: 250, y: 410 },
		data: {
			activityType: "if_else",
			label: "User Found?",
			subtitle: "Check if user exists",
			icon: "if_else",
			enabled: true,
			config: { condition: "user != null" },
		},
	},
	{
		id: "gpr-validate-mfa",
		type: "activity",
		position: { x: 100, y: 550 },
		data: {
			activityType: "validate_mfa",
			label: "Validate MFA",
			subtitle: "Verify manager approval",
			icon: "validate_mfa",
			enabled: true,
			config: { method: "manager_approval", timeout: "300" },
		},
	},
	{
		id: "gpr-log-not-found",
		type: "activity",
		position: { x: 430, y: 550 },
		data: {
			activityType: "log_action",
			label: "Log User Not Found",
			subtitle: "Log failed lookup to audit",
			icon: "log_action",
			enabled: true,
			config: {},
		},
	},
	{
		id: "gpr-reset-pw",
		type: "activity",
		position: { x: 100, y: 670 },
		data: {
			activityType: "reset_password",
			label: "Reset Password",
			subtitle: "Generate temp password via API",
			icon: "reset_password",
			enabled: true,
			config: { passwordPolicy: "strong-16char", requireChange: "true" },
		},
	},
	{
		id: "gpr-send-email",
		type: "activity",
		position: { x: 100, y: 790 },
		data: {
			activityType: "send_email",
			label: "Send Credentials",
			subtitle: "Email temp password to user",
			icon: "send_email",
			enabled: true,
			config: {
				recipient: "{{user.email}}",
				subject: "Your password has been reset",
				template: "password-reset-notification",
			},
		},
	},
	{
		id: "gpr-log-success",
		type: "activity",
		position: { x: 100, y: 910 },
		data: {
			activityType: "log_action",
			label: "Log Reset Complete",
			subtitle: "Audit log: password reset",
			icon: "log_action",
			enabled: true,
			config: {},
		},
	},
];

const edgeStyle = { stroke: "#94a3b8", strokeWidth: 2 };
const edgeMarker = { type: MarkerType.ArrowClosed, color: "#94a3b8" };

export const GOOGLE_PASSWORD_RESET_EDGES: Edge[] = [
	{
		id: "gpr-e-start",
		source: "start",
		target: "gpr-parse-input",
		type: "smoothstep",
		animated: false,
		style: edgeStyle,
		markerEnd: edgeMarker,
	},
	{
		id: "gpr-e-parse-trim",
		source: "gpr-parse-input",
		target: "gpr-trim-email",
		type: "smoothstep",
		animated: false,
		style: edgeStyle,
		markerEnd: edgeMarker,
	},
	{
		id: "gpr-e-trim-lookup",
		source: "gpr-trim-email",
		target: "gpr-lookup-user",
		type: "smoothstep",
		animated: false,
		style: edgeStyle,
		markerEnd: edgeMarker,
	},
	{
		id: "gpr-e-lookup-check",
		source: "gpr-lookup-user",
		target: "gpr-check-user",
		type: "smoothstep",
		animated: false,
		style: edgeStyle,
		markerEnd: edgeMarker,
	},
	{
		id: "gpr-e-check-mfa",
		source: "gpr-check-user",
		sourceHandle: "true",
		target: "gpr-validate-mfa",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#22c55e", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
		label: "Found",
	},
	{
		id: "gpr-e-check-notfound",
		source: "gpr-check-user",
		sourceHandle: "false",
		target: "gpr-log-not-found",
		type: "smoothstep",
		animated: false,
		style: { stroke: "#ef4444", strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
		label: "Not Found",
	},
	{
		id: "gpr-e-mfa-reset",
		source: "gpr-validate-mfa",
		target: "gpr-reset-pw",
		type: "smoothstep",
		animated: false,
		style: edgeStyle,
		markerEnd: edgeMarker,
	},
	{
		id: "gpr-e-reset-email",
		source: "gpr-reset-pw",
		target: "gpr-send-email",
		type: "smoothstep",
		animated: false,
		style: edgeStyle,
		markerEnd: edgeMarker,
	},
	{
		id: "gpr-e-email-log",
		source: "gpr-send-email",
		target: "gpr-log-success",
		type: "smoothstep",
		animated: false,
		style: edgeStyle,
		markerEnd: edgeMarker,
	},
];

// Toolbox items available for drag-and-drop
export const TOOLBOX_ITEMS: ToolboxItem[] = [
	{
		type: "split",
		label: "Split",
		subtitle: "Split string into parts",
		icon: "split",
		category: "Data",
	},
	{
		type: "user_name",
		label: "User Name",
		subtitle: "Extract user name",
		icon: "user_name",
		category: "Data",
	},
	{
		type: "trim_name",
		label: "Trim Name",
		subtitle: "Remove whitespace",
		icon: "trim_name",
		category: "Data",
	},
	{
		type: "azure_user",
		label: "Azure AD User",
		subtitle: "Fetch Azure AD user",
		icon: "azure_user",
		category: "Integrations",
	},
	{
		type: "filter_results",
		label: "Filter Results",
		subtitle: "Filter records",
		icon: "filter_results",
		category: "Data",
	},
	{
		type: "display_name",
		label: "Display Name",
		subtitle: "Get display name",
		icon: "display_name",
		category: "Data",
	},
	{
		type: "row_count",
		label: "Row Count",
		subtitle: "Count rows",
		icon: "row_count",
		category: "Data",
	},
	{
		type: "if_else",
		label: "If / Else",
		subtitle: "Conditional branch",
		icon: "if_else",
		category: "Logic",
	},
	{
		type: "google_user",
		label: "Google Workspace User",
		subtitle: "Lookup Google user",
		icon: "google_user",
		category: "Integrations",
	},
	{
		type: "validate_mfa",
		label: "Validate MFA",
		subtitle: "Verify MFA / approval",
		icon: "validate_mfa",
		category: "Logic",
	},
	{
		type: "reset_password",
		label: "Reset Password",
		subtitle: "Generate new password",
		icon: "reset_password",
		category: "Integrations",
	},
	{
		type: "send_email",
		label: "Send Email",
		subtitle: "Send notification email",
		icon: "send_email",
		category: "Integrations",
	},
	{
		type: "log_action",
		label: "Log Action",
		subtitle: "Write to audit log",
		icon: "log_action",
		category: "Data",
	},
];

// Mock workflow variables — simulates the flattened variable list from all activities
// In production, these come from the workflow engine's variable registry
export interface WorkflowVariable {
	name: string;
	activityId: string; // which activity owns this variable
	activityLabel: string;
	type: "string" | "number" | "boolean" | "object" | "array";
}

export const MOCK_WORKFLOW_VARIABLES: WorkflowVariable[] = [
	// Split activity outputs
	{ name: "splitResult", activityId: "split-1", activityLabel: "Split", type: "string" },
	{ name: "splitParts", activityId: "split-1", activityLabel: "Split", type: "array" },
	{ name: "splitCount", activityId: "split-1", activityLabel: "Split", type: "number" },
	// User Name activity outputs
	{ name: "firstName", activityId: "user-name-1", activityLabel: "User Name", type: "string" },
	{ name: "lastName", activityId: "user-name-1", activityLabel: "User Name", type: "string" },
	{ name: "fullName", activityId: "user-name-1", activityLabel: "User Name", type: "string" },
	{ name: "emailAddress", activityId: "user-name-1", activityLabel: "User Name", type: "string" },
	// Trim Name activity outputs
	{ name: "trimmedName", activityId: "trim-name-1", activityLabel: "Trim Name", type: "string" },
	// Azure AD User activity outputs
	{ name: "azureUserId", activityId: "azure-user-1", activityLabel: "Azure AD User", type: "string" },
	{ name: "azureUserPrincipalName", activityId: "azure-user-1", activityLabel: "Azure AD User", type: "string" },
	{ name: "azureDisplayName", activityId: "azure-user-1", activityLabel: "Azure AD User", type: "string" },
	{ name: "azureAccountEnabled", activityId: "azure-user-1", activityLabel: "Azure AD User", type: "boolean" },
	{ name: "azureDepartment", activityId: "azure-user-1", activityLabel: "Azure AD User", type: "string" },
	{ name: "azureJobTitle", activityId: "azure-user-1", activityLabel: "Azure AD User", type: "string" },
	{ name: "azureManager", activityId: "azure-user-1", activityLabel: "Azure AD User", type: "string" },
	// Filter activity outputs
	{ name: "filteredResults", activityId: "filter-1", activityLabel: "Filter Results", type: "array" },
	{ name: "filterMatchCount", activityId: "filter-1", activityLabel: "Filter Results", type: "number" },
	// Display Name activity outputs
	{ name: "displayName", activityId: "display-name-1", activityLabel: "Display Name", type: "string" },
	// Row Count activity outputs
	{ name: "rowCount", activityId: "row-count-1", activityLabel: "Row Count", type: "number" },
	// If/Else activity outputs
	{ name: "conditionResult", activityId: "if-else-1", activityLabel: "If / Else", type: "boolean" },
	{ name: "branchTaken", activityId: "if-else-1", activityLabel: "If / Else", type: "string" },
];

// Pre-built workflow templates
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
	{
		id: "azure-ad-offboarding",
		name: "Azure AD Offboarding",
		description: "Disable user accounts in Azure AD when employees leave",
	},
	{
		id: "google-password-reset",
		name: "Google Password Reset",
		description: "Reset Google Workspace passwords with MFA verification",
	},
	{
		id: "ticket-routing",
		name: "Ticket Routing",
		description: "Auto-route support tickets based on category and priority",
	},
	{
		id: "onboarding-checklist",
		name: "Onboarding Checklist",
		description: "New employee provisioning across multiple systems",
	},
];
