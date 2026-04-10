/**
 * Shared agent constants
 *
 * Single source of truth for icon mappings, color mappings, and avatar colors
 * used across agent pages and components.
 */

import {
	Album,
	AlertCircle,
	Award,
	BookOpen,
	BookOpenText,
	Bot,
	Briefcase,
	Calendar,
	ClipboardList,
	Coffee,
	Database,
	FileText,
	Folder,
	Globe,
	GraduationCap,
	Headphones,
	Heart,
	HelpCircle,
	Home,
	Key,
	Keyboard,
	Landmark,
	Layers,
	LineChart,
	Lock,
	Mail,
	Map as MapIcon,
	MessageSquare,
	Monitor,
	Package,
	Phone,
	Rocket,
	Settings,
	ShieldCheck,
	ShoppingCart,
	Squirrel,
	Star,
	Target,
	ThumbsUp,
	TrendingUp,
	Truck,
	Users,
	Wrench,
	Zap,
} from "lucide-react";

/**
 * Maps icon string IDs to Lucide React components.
 * Used by AgentChatPage, AgentTestPage, AgentTemplateModal, and builder.
 */
export const AGENT_ICON_MAP: Record<string, React.ElementType> = {
	squirrel: Squirrel,
	bot: Bot,
	headphones: Headphones,
	"shield-check": ShieldCheck,
	key: Key,
	"book-open": BookOpen,
	"trending-up": TrendingUp,
	"clipboard-list": ClipboardList,
	"line-chart": LineChart,
	briefcase: Briefcase,
	users: Users,
	landmark: Landmark,
	truck: Truck,
	award: Award,
	settings: Settings,
	"alert-circle": AlertCircle,
	rocket: Rocket,
	"graduation-cap": GraduationCap,
	heart: Heart,
	zap: Zap,
	globe: Globe,
	lock: Lock,
	mail: Mail,
	phone: Phone,
	star: Star,
	target: Target,
	"thumbs-up": ThumbsUp,
	wrench: Wrench,
	calendar: Calendar,
	coffee: Coffee,
	database: Database,
	folder: Folder,
	home: Home,
	layers: Layers,
	map: MapIcon,
	package: Package,
	"shopping-cart": ShoppingCart,
	"message-square": MessageSquare,
	// Template-specific icons
	monitor: Monitor,
	"book-open-text": BookOpenText,
	keyboard: Keyboard,
	album: Album,
	"help-circle": HelpCircle,
	"file-text": FileText,
};

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
 * Available icons for the icon picker in the builder.
 * Each entry has an id, component, and search keywords.
 */
export const AVAILABLE_ICONS = [
	{ id: "bot", icon: Bot, keywords: ["ai", "assistant", "robot"] },
	{
		id: "message-square",
		icon: MessageSquare,
		keywords: ["chat", "conversation"],
	},
	{
		id: "headphones",
		icon: Headphones,
		keywords: ["support", "help", "audio"],
	},
	{
		id: "graduation-cap",
		icon: GraduationCap,
		keywords: ["education", "learning", "training"],
	},
	{
		id: "shield-check",
		icon: ShieldCheck,
		keywords: ["security", "compliance", "protection"],
	},
	{
		id: "clipboard-list",
		icon: ClipboardList,
		keywords: ["tasks", "checklist", "todo"],
	},
	{ id: "users", icon: Users, keywords: ["team", "people", "hr"] },
	{ id: "briefcase", icon: Briefcase, keywords: ["work", "business", "job"] },
	{
		id: "book-open",
		icon: BookOpen,
		keywords: ["knowledge", "documentation", "reading"],
	},
	{ id: "zap", icon: Zap, keywords: ["automation", "fast", "power"] },
	{ id: "target", icon: Target, keywords: ["goals", "focus", "aim"] },
	{ id: "globe", icon: Globe, keywords: ["web", "international", "world"] },
	{ id: "lock", icon: Lock, keywords: ["security", "password", "private"] },
	{ id: "mail", icon: Mail, keywords: ["email", "message", "communication"] },
	{ id: "phone", icon: Phone, keywords: ["call", "contact", "support"] },
	{ id: "calendar", icon: Calendar, keywords: ["schedule", "date", "time"] },
	{ id: "database", icon: Database, keywords: ["data", "storage", "info"] },
	{ id: "folder", icon: Folder, keywords: ["files", "documents", "organize"] },
	{
		id: "settings",
		icon: Settings,
		keywords: ["config", "preferences", "options"],
	},
	{ id: "wrench", icon: Wrench, keywords: ["tools", "fix", "repair"] },
	{ id: "heart", icon: Heart, keywords: ["health", "wellness", "care"] },
	{ id: "star", icon: Star, keywords: ["favorite", "rating", "important"] },
	{
		id: "award",
		icon: Award,
		keywords: ["achievement", "recognition", "badge"],
	},
	{ id: "rocket", icon: Rocket, keywords: ["launch", "startup", "fast"] },
	{ id: "coffee", icon: Coffee, keywords: ["break", "cafe", "drink"] },
	{ id: "home", icon: Home, keywords: ["house", "main", "dashboard"] },
	{ id: "key", icon: Key, keywords: ["access", "password", "unlock"] },
	{ id: "layers", icon: Layers, keywords: ["stack", "design", "levels"] },
	{
		id: "map",
		icon: MapIcon,
		keywords: ["location", "navigation", "directions"],
	},
	{ id: "package", icon: Package, keywords: ["shipping", "delivery", "box"] },
	{
		id: "shopping-cart",
		icon: ShoppingCart,
		keywords: ["ecommerce", "buy", "cart"],
	},
	{ id: "thumbs-up", icon: ThumbsUp, keywords: ["like", "approve", "good"] },
	{
		id: "trending-up",
		icon: TrendingUp,
		keywords: ["growth", "analytics", "increase"],
	},
	{
		id: "line-chart",
		icon: LineChart,
		keywords: ["analytics", "data", "metrics"],
	},
	{
		id: "landmark",
		icon: Landmark,
		keywords: ["bank", "finance", "government"],
	},
	{ id: "truck", icon: Truck, keywords: ["delivery", "shipping", "logistics"] },
	{ id: "squirrel", icon: Squirrel, keywords: ["animal", "nature", "cute"] },
];

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
