/**
 * Shared agent constants
 *
 * Single source of truth for icon mappings, color mappings, and avatar colors
 * used across agent pages and components.
 */

import { Album, BookOpenText, Keyboard } from "lucide-react";
import { AVAILABLE_ICONS } from "./agentIcons";

/**
 * Color mappings for agent icon backgrounds.
 * Used by AgentChatPage, AgentTestPage, and builder.
 */
export const AGENT_COLOR_MAP: Record<string, { bg: string; text: string }> = {
	slate: { bg: "bg-slate-800", text: "text-white" },
	blue: { bg: "bg-blue-600", text: "text-white" },
	emerald: { bg: "bg-emerald-600", text: "text-white" },
	purple: { bg: "bg-purple-600", text: "text-white" },
	orange: { bg: "bg-orange-500", text: "text-white" },
	rose: { bg: "bg-rose-500", text: "text-white" },
};

/**
 * Extended color options for the icon picker in the builder.
 * Includes preview class for the color swatch display.
 */
export const ICON_COLORS = [
	{
		id: "slate",
		bg: "bg-slate-800",
		text: "text-white",
		preview: "bg-slate-800",
	},
	{ id: "blue", bg: "bg-blue-600", text: "text-white", preview: "bg-blue-600" },
	{
		id: "emerald",
		bg: "bg-emerald-600",
		text: "text-white",
		preview: "bg-emerald-600",
	},
	{
		id: "violet",
		bg: "bg-violet-200",
		text: "text-foreground",
		preview: "bg-violet-200",
	},
	{
		id: "purple",
		bg: "bg-purple-600",
		text: "text-white",
		preview: "bg-purple-600",
	},
	{
		id: "orange",
		bg: "bg-orange-500",
		text: "text-white",
		preview: "bg-orange-500",
	},
	{ id: "rose", bg: "bg-rose-500", text: "text-white", preview: "bg-rose-500" },
];

/**
 * Maps icon string IDs to Lucide React components.
 * Derived from AVAILABLE_ICONS (picker options) plus a few template-only
 * icons referenced by agentMocks but not exposed in the picker.
 */
export const AGENT_ICON_MAP: Record<string, React.ElementType> = {
	...Object.fromEntries(AVAILABLE_ICONS.map(({ id, icon }) => [id, icon])),
	album: Album,
	"book-open-text": BookOpenText,
	keyboard: Keyboard,
};

/**
 * Avatar background colors for the agents table.
 */
export const AVATAR_COLORS: Record<string, string> = {
	teal: "bg-teal-200",
	purple: "bg-purple-100",
	sky: "bg-sky-200",
	indigo: "bg-indigo-100",
	emerald: "bg-emerald-100",
};

/**
 * Agent type display metadata.
 */
export const AGENT_TYPE_INFO = {
	answer: {
		label: "Answer agent",
		shortLabel: "Answer Agent",
		shortDesc:
			"Use your company's knowledge and gives clear, helpful responses.",
		subDesc: "Perfect for HR, IT, and policy Q&A.",
		description:
			"turning pre-retrieved content (from internal or external sources) into clear, conversational answers",
		iconBg: "bg-purple-100",
		iconColor: "text-purple-600",
	},
	knowledge: {
		label: "Knowledge agent",
		shortLabel: "Knowledge Agent",
		shortDesc: "Documents you choose to give strict, policy-accurate answers",
		subDesc: "Great for compliance, legal, HR policy, device manuals.",
		description:
			"providing answers directly from its pre-configured knowledge without requiring search",
		iconBg: "bg-emerald-100",
		iconColor: "text-emerald-600",
	},
	workflow: {
		label: "Workflow agent",
		shortLabel: "Workflow Agent",
		shortDesc:
			"Runs automations and performs tasks based on leveraging Resolve actions.",
		subDesc: "Great for password resets, access requests, onboarding tasks.",
		description:
			"running automations or workflows and explaining the results back to users",
		iconBg: "bg-slate-100",
		iconColor: "text-slate-600",
	},
};
