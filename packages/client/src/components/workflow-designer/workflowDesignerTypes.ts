import {
	Cloud,
	FileCheck,
	Filter,
	GitBranch,
	Hash,
	KeyRound,
	type LucideProps,
	Mail,
	Monitor,
	Scissors,
	ShieldCheck,
	SplitSquareVertical,
	User,
} from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

// Activity types available in the workflow designer
export type ActivityType =
	| "split"
	| "user_name"
	| "trim_name"
	| "azure_user"
	| "filter_results"
	| "display_name"
	| "row_count"
	| "if_else"
	| "google_user"
	| "validate_mfa"
	| "reset_password"
	| "send_email"
	| "log_action";

// Data attached to each activity node — index signature required by React Flow
export interface ActivityNodeData {
	activityType: ActivityType;
	label: string;
	subtitle: string;
	icon: string;
	enabled: boolean;
	config: ActivityConfig;
	[key: string]: unknown;
}

// Config fields for activity settings
export interface ActivityConfig {
	endPoint?: string;
	tenantId?: string;
	clientId?: string;
	clientSecret?: string;
	scope?: string;
	[key: string]: string | undefined;
}

// Jarvis chat message
export interface JarvisMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	suggestions?: string[];
}

// Workflow tab (for multi-tab support)
export interface WorkflowTab {
	id: string;
	name: string;
}

// Toolbox item for drag-and-drop
export interface ToolboxItem {
	type: ActivityType;
	label: string;
	subtitle: string;
	icon: string;
	category: string;
}

// Workflow template
export interface WorkflowTemplate {
	id: string;
	name: string;
	description: string;
}

// Config form field definition
export interface ConfigField {
	name: string;
	label: string;
	type: "text" | "password" | "url";
}

// Maps ActivityType to a lucide icon component
export const ACTIVITY_ICON_MAP: Record<
	ActivityType,
	ForwardRefExoticComponent<
		Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
	>
> = {
	split: SplitSquareVertical,
	user_name: User,
	trim_name: Scissors,
	azure_user: Cloud,
	filter_results: Filter,
	display_name: Monitor,
	row_count: Hash,
	if_else: GitBranch,
	google_user: Cloud,
	validate_mfa: ShieldCheck,
	reset_password: KeyRound,
	send_email: Mail,
	log_action: FileCheck,
};

// Per-type config form field definitions
export const ACTIVITY_CONFIG_FIELDS: Partial<
	Record<ActivityType, ConfigField[]>
> = {
	azure_user: [
		{ name: "endPoint", label: "End Point", type: "url" },
		{ name: "tenantId", label: "Tenant ID", type: "text" },
		{ name: "clientId", label: "Client ID", type: "text" },
		{ name: "clientSecret", label: "Client Secret", type: "password" },
		{ name: "scope", label: "Scope", type: "text" },
	],
	split: [
		{ name: "delimiter", label: "Delimiter", type: "text" },
		{ name: "inputVariable", label: "Input Variable", type: "text" },
	],
	filter_results: [
		{ name: "filterExpression", label: "Filter Expression", type: "text" },
		{ name: "inputVariable", label: "Input Variable", type: "text" },
	],
	if_else: [
		{ name: "condition", label: "Condition", type: "text" },
		{ name: "trueLabel", label: "True Label", type: "text" },
		{ name: "falseLabel", label: "False Label", type: "text" },
	],
	google_user: [
		{ name: "endPoint", label: "Admin SDK Endpoint", type: "url" },
		{ name: "serviceAccount", label: "Service Account Email", type: "text" },
		{ name: "domain", label: "Google Workspace Domain", type: "text" },
	],
	validate_mfa: [
		{ name: "method", label: "MFA Method", type: "text" },
		{ name: "timeout", label: "Verification Timeout (s)", type: "text" },
	],
	reset_password: [
		{ name: "passwordPolicy", label: "Password Policy", type: "text" },
		{ name: "requireChange", label: "Require Change on Login", type: "text" },
	],
	send_email: [
		{ name: "recipient", label: "Recipient", type: "text" },
		{ name: "subject", label: "Email Subject", type: "text" },
		{ name: "template", label: "Email Template", type: "text" },
	],
};
