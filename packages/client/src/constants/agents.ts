/**
 * Shared agent constants
 *
 * Single source of truth for icon mappings, color mappings, and avatar colors
 * used across agent pages and components.
 */

import {
	Activity,
	Album,
	AlertCircle,
	Archive,
	AtSign,
	Award,
	BarChart3,
	Battery,
	Bell,
	BellRing,
	Book,
	Bookmark,
	BookOpen,
	BookOpenText,
	Bot,
	Brain,
	Briefcase,
	Brush,
	Building,
	Building2,
	Calendar,
	CalendarCheck,
	Camera,
	Car,
	CheckCircle,
	CheckSquare,
	ClipboardCheck,
	ClipboardList,
	Clock,
	Cloud,
	Code,
	Code2,
	Coffee,
	Cog,
	Coins,
	Compass,
	Cpu,
	CreditCard,
	Crown,
	Database,
	DollarSign,
	Factory,
	Feather,
	File,
	FileText,
	Filter,
	Fingerprint,
	Flag,
	Flame,
	Folder,
	FolderOpen,
	Gauge,
	GitBranch,
	Globe,
	GraduationCap,
	Handshake,
	Hash,
	Headphones,
	Heart,
	HeartPulse,
	HelpCircle,
	Home,
	Image as ImageIcon,
	Inbox,
	Info,
	Key,
	Keyboard,
	KeyRound,
	Landmark,
	Laptop,
	Layers,
	LifeBuoy,
	Lightbulb,
	LineChart,
	Link,
	ListChecks,
	ListTodo,
	Lock,
	Mail,
	Map as MapIcon,
	MapPin,
	Medal,
	Megaphone,
	MessageCircle,
	MessageSquare,
	Monitor,
	Navigation,
	Network,
	Newspaper,
	NotebookText,
	Package,
	Palette,
	Pencil,
	PenTool,
	Phone,
	PieChart,
	Plane,
	Plug,
	Receipt,
	Rocket,
	Send,
	Server,
	Settings,
	ShieldAlert,
	ShieldCheck,
	ShoppingBag,
	ShoppingCart,
	Sliders,
	Smartphone,
	Sparkles,
	Squirrel,
	Star,
	Stethoscope,
	Store,
	Tag,
	Tags,
	Target,
	Terminal,
	ThumbsUp,
	Timer,
	TrendingUp,
	Trophy,
	Truck,
	UserCheck,
	UserCog,
	UserPlus,
	Users,
	Video,
	Wallet,
	Wifi,
	Wrench,
	Zap,
} from "lucide-react";

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
	// AI & assistant
	{ id: "bot", icon: Bot, keywords: ["ai", "assistant", "robot"] },
	{ id: "sparkles", icon: Sparkles, keywords: ["ai", "magic", "smart"] },
	{ id: "brain", icon: Brain, keywords: ["ai", "intelligence", "thinking"] },
	{ id: "cpu", icon: Cpu, keywords: ["ai", "processor", "compute"] },
	{ id: "zap", icon: Zap, keywords: ["automation", "fast", "power"] },
	// Communication
	{
		id: "message-square",
		icon: MessageSquare,
		keywords: ["chat", "conversation", "message"],
	},
	{
		id: "message-circle",
		icon: MessageCircle,
		keywords: ["chat", "bubble", "talk"],
	},
	{
		id: "headphones",
		icon: Headphones,
		keywords: ["support", "help", "audio"],
	},
	{ id: "mail", icon: Mail, keywords: ["email", "message", "communication"] },
	{ id: "send", icon: Send, keywords: ["submit", "deliver", "reply"] },
	{ id: "inbox", icon: Inbox, keywords: ["mail", "messages", "received"] },
	{ id: "phone", icon: Phone, keywords: ["call", "contact", "telephone"] },
	{
		id: "megaphone",
		icon: Megaphone,
		keywords: ["announcement", "broadcast", "notify"],
	},
	{ id: "at-sign", icon: AtSign, keywords: ["email", "mention", "handle"] },
	// Knowledge & learning
	{
		id: "book-open",
		icon: BookOpen,
		keywords: ["knowledge", "documentation", "reading"],
	},
	{ id: "book", icon: Book, keywords: ["library", "reference", "reading"] },
	{
		id: "notebook-text",
		icon: NotebookText,
		keywords: ["notes", "journal", "writing"],
	},
	{
		id: "newspaper",
		icon: Newspaper,
		keywords: ["news", "article", "publication"],
	},
	{
		id: "graduation-cap",
		icon: GraduationCap,
		keywords: ["education", "learning", "training"],
	},
	{
		id: "file-text",
		icon: FileText,
		keywords: ["document", "text", "article"],
	},
	{ id: "file", icon: File, keywords: ["document", "page"] },
	// Support & help
	{
		id: "life-buoy",
		icon: LifeBuoy,
		keywords: ["support", "help", "rescue"],
	},
	{ id: "info", icon: Info, keywords: ["information", "about", "details"] },
	{
		id: "help-circle",
		icon: HelpCircle,
		keywords: ["help", "question", "faq"],
	},
	// Security & identity
	{
		id: "shield-check",
		icon: ShieldCheck,
		keywords: ["security", "compliance", "verified"],
	},
	{
		id: "shield-alert",
		icon: ShieldAlert,
		keywords: ["security", "warning", "risk"],
	},
	{ id: "lock", icon: Lock, keywords: ["security", "password", "private"] },
	{ id: "key", icon: Key, keywords: ["access", "password", "unlock"] },
	{
		id: "key-round",
		icon: KeyRound,
		keywords: ["access", "credentials", "auth"],
	},
	{
		id: "fingerprint",
		icon: Fingerprint,
		keywords: ["identity", "biometric", "auth"],
	},
	{
		id: "user-check",
		icon: UserCheck,
		keywords: ["verified", "identity", "approved"],
	},
	// People & team
	{ id: "users", icon: Users, keywords: ["team", "people", "hr"] },
	{
		id: "user-plus",
		icon: UserPlus,
		keywords: ["onboarding", "add user", "invite"],
	},
	{ id: "user-cog", icon: UserCog, keywords: ["admin", "user settings"] },
	{
		id: "crown",
		icon: Crown,
		keywords: ["vip", "premium", "admin"],
	},
	{
		id: "handshake",
		icon: Handshake,
		keywords: ["agreement", "partner", "deal"],
	},
	// Tasks & productivity
	{
		id: "clipboard-list",
		icon: ClipboardList,
		keywords: ["tasks", "checklist", "todo"],
	},
	{
		id: "clipboard-check",
		icon: ClipboardCheck,
		keywords: ["done", "approved", "completed"],
	},
	{
		id: "check-square",
		icon: CheckSquare,
		keywords: ["task", "done", "complete"],
	},
	{
		id: "list-todo",
		icon: ListTodo,
		keywords: ["tasks", "todo", "list"],
	},
	{
		id: "list-checks",
		icon: ListChecks,
		keywords: ["checklist", "done", "tasks"],
	},
	{
		id: "check-circle",
		icon: CheckCircle,
		keywords: ["done", "success", "approved"],
	},
	{ id: "calendar", icon: Calendar, keywords: ["schedule", "date", "event"] },
	{
		id: "calendar-check",
		icon: CalendarCheck,
		keywords: ["schedule", "booked", "event"],
	},
	{ id: "clock", icon: Clock, keywords: ["time", "schedule", "hour"] },
	{ id: "timer", icon: Timer, keywords: ["countdown", "stopwatch", "time"] },
	// Data & analytics
	{ id: "database", icon: Database, keywords: ["data", "storage", "records"] },
	{
		id: "bar-chart-3",
		icon: BarChart3,
		keywords: ["analytics", "chart", "stats"],
	},
	{
		id: "line-chart",
		icon: LineChart,
		keywords: ["analytics", "trend", "metrics"],
	},
	{
		id: "pie-chart",
		icon: PieChart,
		keywords: ["analytics", "breakdown", "percentage"],
	},
	{
		id: "trending-up",
		icon: TrendingUp,
		keywords: ["growth", "analytics", "increase"],
	},
	{
		id: "activity",
		icon: Activity,
		keywords: ["monitor", "pulse", "live"],
	},
	{
		id: "gauge",
		icon: Gauge,
		keywords: ["speed", "performance", "meter"],
	},
	// Developer & infrastructure
	{ id: "code", icon: Code, keywords: ["developer", "script", "programming"] },
	{ id: "code-2", icon: Code2, keywords: ["developer", "code", "syntax"] },
	{
		id: "terminal",
		icon: Terminal,
		keywords: ["cli", "shell", "console"],
	},
	{
		id: "git-branch",
		icon: GitBranch,
		keywords: ["version control", "branch", "git"],
	},
	{ id: "server", icon: Server, keywords: ["infrastructure", "host", "rack"] },
	{ id: "cloud", icon: Cloud, keywords: ["saas", "hosted", "online"] },
	{
		id: "network",
		icon: Network,
		keywords: ["topology", "connections", "mesh"],
	},
	{ id: "monitor", icon: Monitor, keywords: ["display", "screen", "desktop"] },
	{ id: "laptop", icon: Laptop, keywords: ["computer", "device", "work"] },
	{
		id: "smartphone",
		icon: Smartphone,
		keywords: ["mobile", "phone", "device"],
	},
	{ id: "wifi", icon: Wifi, keywords: ["network", "wireless", "internet"] },
	{ id: "link", icon: Link, keywords: ["url", "connect", "chain"] },
	// Tools & settings
	{
		id: "settings",
		icon: Settings,
		keywords: ["config", "preferences", "options"],
	},
	{ id: "cog", icon: Cog, keywords: ["config", "gear", "system"] },
	{ id: "sliders", icon: Sliders, keywords: ["controls", "tune", "adjust"] },
	{ id: "wrench", icon: Wrench, keywords: ["tools", "fix", "repair"] },
	// Business & finance
	{ id: "briefcase", icon: Briefcase, keywords: ["work", "business", "job"] },
	{
		id: "building",
		icon: Building,
		keywords: ["office", "company", "corporate"],
	},
	{
		id: "building-2",
		icon: Building2,
		keywords: ["office", "company", "enterprise"],
	},
	{
		id: "landmark",
		icon: Landmark,
		keywords: ["bank", "finance", "government"],
	},
	{
		id: "factory",
		icon: Factory,
		keywords: ["manufacturing", "industry", "production"],
	},
	{ id: "store", icon: Store, keywords: ["shop", "retail", "business"] },
	{
		id: "credit-card",
		icon: CreditCard,
		keywords: ["payment", "billing", "finance"],
	},
	{ id: "wallet", icon: Wallet, keywords: ["money", "funds", "account"] },
	{ id: "receipt", icon: Receipt, keywords: ["invoice", "bill", "payment"] },
	{
		id: "dollar-sign",
		icon: DollarSign,
		keywords: ["money", "price", "cost"],
	},
	{ id: "coins", icon: Coins, keywords: ["money", "currency", "finance"] },
	// Content & creative
	{ id: "folder", icon: Folder, keywords: ["files", "documents", "organize"] },
	{
		id: "folder-open",
		icon: FolderOpen,
		keywords: ["files", "open", "browse"],
	},
	{ id: "archive", icon: Archive, keywords: ["storage", "stash", "keep"] },
	{ id: "image", icon: ImageIcon, keywords: ["picture", "photo", "media"] },
	{ id: "camera", icon: Camera, keywords: ["photo", "capture", "picture"] },
	{ id: "video", icon: Video, keywords: ["film", "record", "media"] },
	{ id: "palette", icon: Palette, keywords: ["design", "colors", "art"] },
	{ id: "brush", icon: Brush, keywords: ["paint", "design", "art"] },
	{
		id: "pen-tool",
		icon: PenTool,
		keywords: ["design", "vector", "create"],
	},
	{ id: "pencil", icon: Pencil, keywords: ["edit", "write", "compose"] },
	{ id: "feather", icon: Feather, keywords: ["write", "author", "light"] },
	// Notifications & awards
	{ id: "bell", icon: Bell, keywords: ["notification", "alert", "ping"] },
	{
		id: "bell-ring",
		icon: BellRing,
		keywords: ["alert", "notification", "alarm"],
	},
	{ id: "flag", icon: Flag, keywords: ["mark", "important", "report"] },
	{
		id: "award",
		icon: Award,
		keywords: ["achievement", "recognition", "badge"],
	},
	{ id: "medal", icon: Medal, keywords: ["prize", "winner", "award"] },
	{ id: "trophy", icon: Trophy, keywords: ["winner", "award", "success"] },
	{ id: "star", icon: Star, keywords: ["favorite", "rating", "important"] },
	{
		id: "bookmark",
		icon: Bookmark,
		keywords: ["save", "favorite", "mark"],
	},
	{ id: "thumbs-up", icon: ThumbsUp, keywords: ["like", "approve", "good"] },
	// Navigation & location
	{
		id: "map",
		icon: MapIcon,
		keywords: ["location", "navigation", "directions"],
	},
	{
		id: "map-pin",
		icon: MapPin,
		keywords: ["location", "place", "address"],
	},
	{
		id: "globe",
		icon: Globe,
		keywords: ["web", "international", "world"],
	},
	{
		id: "compass",
		icon: Compass,
		keywords: ["direction", "explore", "navigate"],
	},
	{
		id: "navigation",
		icon: Navigation,
		keywords: ["direction", "gps", "move"],
	},
	// Transport & logistics
	{ id: "truck", icon: Truck, keywords: ["delivery", "shipping", "logistics"] },
	{ id: "package", icon: Package, keywords: ["shipping", "delivery", "box"] },
	{ id: "plane", icon: Plane, keywords: ["travel", "flight", "transport"] },
	{ id: "car", icon: Car, keywords: ["vehicle", "transport", "drive"] },
	// Commerce
	{
		id: "shopping-cart",
		icon: ShoppingCart,
		keywords: ["ecommerce", "buy", "cart"],
	},
	{
		id: "shopping-bag",
		icon: ShoppingBag,
		keywords: ["retail", "purchase", "shop"],
	},
	// Goals & energy
	{ id: "target", icon: Target, keywords: ["goals", "focus", "aim"] },
	{ id: "rocket", icon: Rocket, keywords: ["launch", "startup", "fast"] },
	{ id: "flame", icon: Flame, keywords: ["hot", "trending", "fire"] },
	{
		id: "lightbulb",
		icon: Lightbulb,
		keywords: ["idea", "tip", "insight"],
	},
	{
		id: "battery",
		icon: Battery,
		keywords: ["power", "charge", "energy"],
	},
	{ id: "plug", icon: Plug, keywords: ["connect", "power", "integration"] },
	// Health
	{ id: "heart", icon: Heart, keywords: ["health", "wellness", "care"] },
	{
		id: "heart-pulse",
		icon: HeartPulse,
		keywords: ["health", "monitoring", "vitals"],
	},
	{
		id: "stethoscope",
		icon: Stethoscope,
		keywords: ["medical", "health", "doctor"],
	},
	// Organization
	{ id: "layers", icon: Layers, keywords: ["stack", "levels", "structure"] },
	{ id: "tag", icon: Tag, keywords: ["label", "category", "mark"] },
	{ id: "tags", icon: Tags, keywords: ["labels", "categories", "tags"] },
	{ id: "hash", icon: Hash, keywords: ["channel", "tag", "number"] },
	{ id: "filter", icon: Filter, keywords: ["sort", "narrow", "refine"] },
	// Lifestyle & misc
	{ id: "home", icon: Home, keywords: ["house", "main", "dashboard"] },
	{ id: "coffee", icon: Coffee, keywords: ["break", "cafe", "drink"] },
	{
		id: "alert-circle",
		icon: AlertCircle,
		keywords: ["warning", "alert", "error"],
	},
	{ id: "squirrel", icon: Squirrel, keywords: ["animal", "mascot", "fun"] },
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
