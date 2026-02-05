/**
 * Feature Flags Type Definitions
 *
 * Centralized feature flag registry for RITA Go.
 * All feature flags must be registered here with their default values.
 */

/**
 * Feature flag identifier
 */
export type FeatureFlagKey =
	| "SHOW_WELCOME_MODAL"
	| "ENABLE_DEBUG_MODE"
	| "ENABLE_EXPERIMENTAL_FEATURES"
	| "ENABLE_AGENTS"
	| "ENABLE_SERVICENOW"
	| "ENABLE_JIRA"
	| "ENABLE_MULTI_FILE_UPLOAD"
	| "ENABLE_TICKETS_V2"
	| "ENABLE_WORKFLOWS"
	| "ENABLE_LANGUAGE_SWITCHER"
	// Auto Pilot flags (platform-controlled)
	| "ENABLE_AUTO_PILOT"
	| "ENABLE_AUTO_PILOT_SUGGESTIONS"
	| "ENABLE_AUTO_PILOT_ACTIONS"
	// Iframe dev tools (platform-controlled)
	| "ENABLE_IFRAME_DEV_TOOLS";

export type FlagSource = "platform" | "local" | "default";

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
	/** Unique identifier for the flag */
	key: FeatureFlagKey;
	/** Human-readable label for UI */
	label: string;
	/** Description of what the flag controls */
	description: string;
	/** Default value (enabled/disabled) */
	defaultValue: boolean;
	/** Category for grouping in UI */
	category: "general" | "debug" | "experimental" | "autopilot";
	/** If true, flag is fetched from Platform Actions API */
	platformControlled?: boolean;
}

/**
 * Resolved flag with source information
 */
export interface ResolvedFlag {
	value: boolean;
	platformValue?: boolean;
}

/**
 * Feature flag registry
 *
 * Central source of truth for all feature flags in the application.
 * Add new flags here with their configuration.
 */
export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
	SHOW_WELCOME_MODAL: {
		key: "SHOW_WELCOME_MODAL",
		label: "Show Welcome Modal",
		description:
			"Force show welcome modal (for testing). Normal users see it automatically on first visit.",
		defaultValue: false,
		category: "debug",
	},
	ENABLE_DEBUG_MODE: {
		key: "ENABLE_DEBUG_MODE",
		label: "Debug Mode",
		description: "Enable developer debugging features and console logs",
		defaultValue: false,
		category: "debug",
	},
	ENABLE_EXPERIMENTAL_FEATURES: {
		key: "ENABLE_EXPERIMENTAL_FEATURES",
		label: "Experimental Features",
		description: "Enable beta features and experimental functionality",
		defaultValue: false,
		category: "experimental",
	},
	ENABLE_AGENTS: {
		key: "ENABLE_AGENTS",
		label: "Agents",
		description: "Enable the Agents experience (Agents list + agent builder)",
		defaultValue: true,
		category: "experimental",
	},
	ENABLE_SERVICENOW: {
		key: "ENABLE_SERVICENOW",
		label: "ServiceNow Integration",
		description: "Enable ServiceNow KB and ITSM sync features",
		defaultValue: false,
		category: "experimental",
	},
	ENABLE_JIRA: {
		key: "ENABLE_JIRA",
		label: "Jira Integration",
		description: "Enable Jira ITSM ticket sync features",
		defaultValue: false,
		category: "experimental",
	},
	ENABLE_MULTI_FILE_UPLOAD: {
		key: "ENABLE_MULTI_FILE_UPLOAD",
		label: "Multi-File Upload",
		description: "Enable uploading multiple files at once in file inputs",
		defaultValue: false,
		category: "experimental",
	},
	ENABLE_TICKETS_V2: {
		key: "ENABLE_TICKETS_V2",
		label: "Tickets",
		description: "Enable new tickets page UI",
		defaultValue: true,
		category: "experimental",
	},
	ENABLE_WORKFLOWS: {
		key: "ENABLE_WORKFLOWS",
		label: "Workflows",
		description: "Enable Workflow Generator dev tool",
		defaultValue: false,
		category: "experimental",
	},
	ENABLE_LANGUAGE_SWITCHER: {
		key: "ENABLE_LANGUAGE_SWITCHER",
		label: "Language Switcher",
		description: "Show language dropdown in header (EN/ES-MX)",
		defaultValue: false,
		category: "experimental",
	},
	// Auto Pilot flags (platform-controlled)
	ENABLE_AUTO_PILOT: {
		key: "ENABLE_AUTO_PILOT",
		label: "Auto Pilot",
		description: "Master toggle for Auto Pilot features",
		defaultValue: false,
		category: "autopilot",
		platformControlled: true,
	},
	ENABLE_AUTO_PILOT_SUGGESTIONS: {
		key: "ENABLE_AUTO_PILOT_SUGGESTIONS",
		label: "Auto Pilot Suggestions",
		description: "Enable AI-powered suggestions in Auto Pilot",
		defaultValue: false,
		category: "autopilot",
		platformControlled: true,
	},
	ENABLE_AUTO_PILOT_ACTIONS: {
		key: "ENABLE_AUTO_PILOT_ACTIONS",
		label: "Auto Pilot Actions",
		description: "Enable automated actions execution in Auto Pilot",
		defaultValue: false,
		category: "autopilot",
		platformControlled: true,
	},
	// Iframe dev tools (platform-controlled)
	ENABLE_IFRAME_DEV_TOOLS: {
		key: "ENABLE_IFRAME_DEV_TOOLS",
		label: "Iframe Dev Tools",
		description:
			"Enable developer tools in iframe chat (download conversation data)",
		defaultValue: false,
		category: "debug",
		platformControlled: true,
	},
};

/**
 * Feature flag state stored in localStorage
 */
export interface FeatureFlagState {
	[key: string]: boolean;
}
