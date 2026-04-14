/**
 * IframeChatPage - Chat page for iframe embedding
 *
 * Stripped-down chat for embedding in iframe:
 * - No sidebar, no header navigation
 * - Uses Valkey IDs from host app (Jarvis) - not Rita's user system
 * - sessionKey param provides user identity + tenant context via Valkey
 *
 * Flow:
 * 1. On mount, call /api/iframe/validate-instantiation with sessionKey
 * 2. Backend fetches Valkey payload (userId, tenantId, credentials)
 * 3. Backend creates session with Valkey IDs, returns cookie + conversationId
 * 4. Call /api/iframe/execute to trigger workflow
 * 5. Render chat with SSE (session cookie enables SSE routing)
 *
 * Debug mode: Add ?debug=true to URL to see debug panel
 */

import type { ChatStatus } from "ai";
import {
	Bug,
	ChevronDown,
	ChevronUp,
	Code,
	Database,
	Download,
	ScrollText,
	Send,
	Trash2,
	Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "../components/ai-elements/conversation";
import { Loader } from "../components/ai-elements/loader";
import type { PromptInputMessage } from "../components/ai-elements/prompt-input";
import { ChatInput } from "../components/chat/ChatInput";
import { ChatV2Content } from "../components/chat/ChatV2Content";
import { ritaToast } from "../components/custom/rita-toast";
import { ValkeySessionPanel } from "../components/devtools/ValkeySessionPanel";
import IframeChatLayout from "../components/layouts/IframeChatLayout";
import { Button } from "../components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { SSEProvider, useSSEContext } from "../contexts/SSEContext";
import { useChatPagination } from "../hooks/useChatPagination";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import {
	type HostMessageMetadata,
	useIframeMessaging,
} from "../hooks/useIframeMessaging";
import { useRitaChat } from "../hooks/useRitaChat";
import { SUPPORTED_DOCUMENT_TYPES } from "../lib/constants";
import { iframeApi } from "../services/iframeApi";
import type { Message as RitaMessage } from "../stores/conversationStore";
import { useConversationStore } from "../stores/conversationStore";
import { useFeatureFlagsStore } from "../stores/feature-flags-store";
import { resetHostOrigin, setHostOrigin } from "../utils/hostOriginStore";

// Debug log entry
interface DebugLogEntry {
	timestamp: string;
	level: "info" | "error" | "warn";
	message: string;
	data?: Record<string, unknown>;
}

// Full Valkey payload for dev tools export
// Sensitive fields (accessToken, refreshToken, clientKey) are redacted by backend
type ValkeyPayload = Record<string, unknown>;

// Debug panel props
interface DebugPanelProps {
	debug: boolean;
	showDebug: boolean;
	setShowDebug: (show: boolean) => void;
	debugLogs: DebugLogEntry[];
}

// Clear chat button (shows when feature flag enabled)
function IframeClearChat({ onClear }: { onClear: () => void }) {
	const devToolsEnabled = useFeatureFlag("ENABLE_IFRAME_DEV_TOOLS");

	if (!devToolsEnabled) return null;

	return (
		<Button
			size="icon"
			variant="ghost"
			className="h-8 w-8 hover:bg-accent"
			onClick={onClear}
			title="Clear conversation"
		>
			<Trash2 className="h-4 w-4" />
		</Button>
	);
}

// Example schemas for demo (json-render.dev format)
const DEMO_SCHEMAS: Record<string, { name: string; schema: object }> = {
	simple: {
		name: "Simple (text + button)",
		schema: {
			root: "column",
			elements: {
				column: { type: "Column", children: ["heading", "subtext", "btn"] },
				heading: {
					type: "Text",
					props: { content: "Hello from Platform!", variant: "heading" },
				},
				subtext: {
					type: "Text",
					props: {
						content: "This UI was rendered from JSON schema sent via RabbitMQ.",
						variant: "muted",
					},
				},
				btn: {
					type: "Button",
					props: { label: "Acknowledge", action: "acknowledge_clicked" },
				},
			},
		},
	},
	form: {
		name: "Form (workflow config)",
		schema: {
			root: "column",
			elements: {
				column: { type: "Column", children: ["heading", "card"] },
				heading: {
					type: "Text",
					props: {
						content: "Configure Workflow Trigger",
						variant: "heading",
					},
				},
				card: {
					type: "Card",
					props: { title: "Trigger Settings" },
					children: ["form"],
				},
				form: {
					type: "Form",
					props: {
						submitAction: "save_trigger_config",
						submitLabel: "Save Configuration",
					},
					children: ["workflowName", "triggerEvent", "filter"],
				},
				workflowName: {
					type: "Input",
					props: {
						name: "workflowName",
						label: "Workflow Name",
						placeholder: "My Automation",
						required: true,
					},
				},
				triggerEvent: {
					type: "Select",
					props: {
						name: "triggerEvent",
						label: "Trigger Event",
						options: [
							{ label: "On Ticket Created", value: "ticket_created" },
							{ label: "On SLA Breach", value: "sla_breach" },
							{ label: "On Status Change", value: "status_change" },
						],
					},
				},
				filter: {
					type: "Input",
					props: {
						name: "filter",
						label: "Filter Condition",
						placeholder: "priority = 'high'",
						inputType: "textarea",
					},
				},
			},
		},
	},
	date: {
		name: "Date (select fields)",
		schema: {
			root: "column",
			elements: {
				column: {
					type: "Column",
					children: ["heading", "subtext", "card"],
				},
				heading: {
					type: "Text",
					props: { content: "Select a Date", variant: "heading" },
				},
				subtext: {
					type: "Text",
					props: {
						content: "Choose month, day, and year.",
						variant: "muted",
					},
				},
				card: {
					type: "Card",
					props: { title: "Date Selection" },
					children: ["form"],
				},
				form: {
					type: "Form",
					props: {
						submitAction: "submit_date",
						submitLabel: "Confirm Date",
					},
					children: ["dateRow"],
				},
				dateRow: {
					type: "Row",
					props: { gap: 12 },
					children: ["month", "day", "year"],
				},
				month: {
					type: "Select",
					props: {
						name: "month",
						label: "Month",
						options: [
							{ label: "January", value: "01" },
							{ label: "February", value: "02" },
							{ label: "March", value: "03" },
							{ label: "April", value: "04" },
							{ label: "May", value: "05" },
							{ label: "June", value: "06" },
							{ label: "July", value: "07" },
							{ label: "August", value: "08" },
							{ label: "September", value: "09" },
							{ label: "October", value: "10" },
							{ label: "November", value: "11" },
							{ label: "December", value: "12" },
						],
					},
				},
				day: {
					type: "Select",
					props: {
						name: "day",
						label: "Day",
						options: Array.from({ length: 31 }, (_, i) => ({
							label: String(i + 1),
							value: String(i + 1).padStart(2, "0"),
						})),
					},
				},
				year: {
					type: "Select",
					props: {
						name: "year",
						label: "Year",
						options: Array.from({ length: 100 }, (_, i) => {
							const yr = new Date().getFullYear() - i;
							return { label: String(yr), value: String(yr) };
						}),
					},
				},
			},
		},
	},
	dashboard: {
		name: "Dashboard (stats + table)",
		schema: {
			root: "column",
			elements: {
				column: {
					type: "Column",
					children: ["heading", "statsRow", "ticketCard"],
				},
				heading: {
					type: "Text",
					props: { content: "Activity Summary", variant: "heading" },
				},
				statsRow: {
					type: "Row",
					props: { gap: 12 },
					children: ["totalStat", "openStat", "avgStat"],
				},
				totalStat: {
					type: "Stat",
					props: {
						label: "Total Tickets",
						value: "1,234",
						change: "+12%",
						changeType: "positive",
					},
				},
				openStat: {
					type: "Stat",
					props: {
						label: "Open Issues",
						value: "42",
						change: "-5%",
						changeType: "negative",
					},
				},
				avgStat: {
					type: "Stat",
					props: {
						label: "Avg Response",
						value: "2.4h",
						changeType: "neutral",
					},
				},
				ticketCard: {
					type: "Card",
					props: { title: "Recent Tickets" },
					children: ["ticketTable"],
				},
				ticketTable: {
					type: "Table",
					props: {
						columns: [
							{ key: "id", label: "ID" },
							{ key: "title", label: "Title" },
							{ key: "status", label: "Status" },
						],
						rows: [
							{ id: "TKT-001", title: "Login issue", status: "Open" },
							{ id: "TKT-002", title: "Payment failed", status: "Pending" },
							{ id: "TKT-003", title: "Reset password", status: "Closed" },
						],
					},
				},
			},
		},
	},
	codereview: {
		name: "Code Review (diff)",
		schema: {
			root: "column",
			elements: {
				column: {
					type: "Column",
					children: ["heading", "prTitle", "diffCard", "btnRow"],
				},
				heading: {
					type: "Text",
					props: { content: "Code Review Request", variant: "heading" },
				},
				prTitle: {
					type: "Text",
					props: {
						content: "PR #142: Fix authentication bug",
						variant: "subheading",
					},
				},
				diffCard: {
					type: "Card",
					props: {
						title: "src/auth/login.ts",
						description: "+4 -1 lines changed",
					},
					children: [
						"diff1",
						"diff2",
						"diff3",
						"diff4",
						"diff5",
						"diff6",
						"diff7",
					],
				},
				diff1: {
					type: "Text",
					props: {
						content: "function validateSession(token) {",
						variant: "diff-context",
					},
				},
				diff2: {
					type: "Text",
					props: {
						content: "-  return redirect('/dashboard');",
						variant: "diff-remove",
					},
				},
				diff3: {
					type: "Text",
					props: { content: "+  if (!token) {", variant: "diff-add" },
				},
				diff4: {
					type: "Text",
					props: {
						content: "+    return redirect('/login');",
						variant: "diff-add",
					},
				},
				diff5: {
					type: "Text",
					props: { content: "+  }", variant: "diff-add" },
				},
				diff6: {
					type: "Text",
					props: {
						content: "+  return redirect('/dashboard');",
						variant: "diff-add",
					},
				},
				diff7: {
					type: "Text",
					props: { content: "}", variant: "diff-context" },
				},
				btnRow: {
					type: "Row",
					props: { gap: 8 },
					children: ["approveBtn", "changesBtn"],
				},
				approveBtn: {
					type: "Button",
					props: {
						label: "Approve",
						action: "approve_pr",
						variant: "default",
					},
				},
				changesBtn: {
					type: "Button",
					props: {
						label: "Request Changes",
						action: "request_changes",
						variant: "outline",
					},
				},
			},
		},
	},
	diagram: {
		name: "Diagram (Mermaid)",
		schema: {
			root: "column",
			elements: {
				column: { type: "Column", children: ["heading", "diagram"] },
				heading: {
					type: "Text",
					props: { content: "Workflow Flow", variant: "heading" },
				},
				diagram: {
					type: "Diagram",
					props: {
						title: "User Authentication Flow",
						expandable: true,
						code: `flowchart TD
    A[User Request] --> B{Has Token?}
    B -->|Yes| C[Validate Token]
    B -->|No| D[Redirect to Login]
    C -->|Valid| E[Grant Access]
    C -->|Invalid| D
    E --> F[Load Dashboard]
    D --> G[Show Login Form]
    G --> H[Submit Credentials]
    H --> I{Valid?}
    I -->|Yes| J[Create Session]
    I -->|No| K[Show Error]
    J --> E
    K --> G`,
					},
				},
			},
		},
	},
};

// Floating dev panel for mock mode - simulates Platform sending schema
function MockPlatformPanel({
	conversationId,
	isOpen,
	onToggle,
	onLog,
	onOpenActivityLog,
}: {
	conversationId: string;
	isOpen: boolean;
	onToggle: () => void;
	onLog: (
		level: "info" | "error" | "warn",
		message: string,
		data?: Record<string, unknown>,
	) => void;
	onOpenActivityLog: () => void;
}) {
	const { addMessage } = useConversationStore();
	const [selectedPreset, setSelectedPreset] = useState("simple");
	const [isSmallViewport, setIsSmallViewport] = useState(
		window.innerWidth < 500,
	);

	// Detect small viewport for compact layout
	useEffect(() => {
		const handleResize = () => setIsSmallViewport(window.innerWidth < 500);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);
	const [customJson, setCustomJson] = useState(
		JSON.stringify(DEMO_SCHEMAS.codereview.schema, null, 2),
	);
	const [useCustom, setUseCustom] = useState(false);
	const [lastSentSchema, setLastSentSchema] = useState<any>(null);

	const handlePresetChange = (preset: string) => {
		setSelectedPreset(preset);
		setCustomJson(JSON.stringify(DEMO_SCHEMAS[preset].schema, null, 2));
		setUseCustom(false);
	};

	const handleSendSchema = () => {
		try {
			const schema = useCustom
				? JSON.parse(customJson)
				: DEMO_SCHEMAS[selectedPreset].schema;
			setLastSentSchema(schema);

			// Log what platform is sending
			onLog("info", "⬇️ SSE Event received (ui_schema)", {
				root: schema.root,
				elementCount: schema.elements ? Object.keys(schema.elements).length : 0,
			});

			// Simulate Platform sending message via RabbitMQ → SSE → Client
			const messageId = `platform-${Date.now()}`;
			addMessage({
				id: messageId,
				role: "assistant",
				message: "",
				timestamp: new Date(),
				conversation_id: conversationId,
				status: "completed",
				metadata: {
					ui_schema: schema,
					turn_complete: true,
				},
			});

			onLog("info", "⬇️ UI schema rendered in Jarvis", {
				messageId,
				schema: `${JSON.stringify(schema).substring(0, 100)}...`,
			});
		} catch (e) {
			onLog("error", "Failed to parse JSON", { error: (e as Error).message });
			alert(`Invalid JSON: ${(e as Error).message}`);
		}
	};

	if (!isOpen) {
		return null;
	}

	// Compact layout for small viewports (iframe widget)
	if (isSmallViewport) {
		return (
			<div className="fixed left-2 right-2 top-2 bottom-[50%] z-50 bg-slate-900 text-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 shrink-0">
					<div className="flex items-center gap-2">
						<Code className="w-3 h-3 text-blue-400" />
						<span className="font-semibold text-[10px]">
							Platform Simulator
						</span>
					</div>
					<button
						type="button"
						onClick={onToggle}
						className="text-slate-400 hover:text-white text-sm leading-none"
					>
						×
					</button>
				</div>

				{/* Two-column content */}
				<div className="flex-1 flex overflow-hidden">
					{/* Left: Schema presets */}
					<div className="w-20 shrink-0 p-2 border-r border-slate-700 overflow-auto">
						<div className="text-[9px] text-slate-500 mb-1">Schema</div>
						<div className="flex flex-col gap-1">
							{Object.entries(DEMO_SCHEMAS).map(([key, { name }]) => (
								<button
									key={key}
									type="button"
									onClick={() => handlePresetChange(key)}
									className={`px-1.5 py-1 rounded text-[9px] text-left ${
										selectedPreset === key && !useCustom
											? "bg-blue-600 text-white"
											: "bg-slate-800 text-slate-300 hover:bg-slate-700"
									}`}
								>
									{name.split(" ")[0]}
								</button>
							))}
							<button
								type="button"
								onClick={() => setUseCustom(true)}
								className={`px-1.5 py-1 rounded text-[9px] text-left ${
									useCustom
										? "bg-blue-600 text-white"
										: "bg-slate-800 text-slate-300 hover:bg-slate-700"
								}`}
							>
								Custom
							</button>
						</div>
					</div>

					{/* Right: JSON editor */}
					<div className="flex-1 flex flex-col overflow-hidden">
						<textarea
							className="flex-1 bg-slate-800 text-slate-200 text-[9px] font-mono p-2 border-none focus:outline-none resize-none"
							value={customJson}
							onChange={(e) => {
								setCustomJson(e.target.value);
								setUseCustom(true);
							}}
						/>
					</div>
				</div>

				{/* Fixed bottom: Send button */}
				<div className="shrink-0 p-2 bg-slate-800 border-t border-slate-700 flex gap-2">
					<button
						type="button"
						onClick={handleSendSchema}
						className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded font-medium text-[10px] flex items-center justify-center gap-1"
					>
						<Send className="w-3 h-3" />
						Send
					</button>
					{lastSentSchema && (
						<button
							type="button"
							onClick={onOpenActivityLog}
							className="px-2 text-[9px] text-green-400 bg-green-900/30 hover:bg-green-900/50 rounded"
							title="View activity log"
						>
							✓ Log
						</button>
					)}
				</div>
			</div>
		);
	}

	// Large viewport layout (original)
	return (
		<div className="fixed top-4 right-4 z-50 w-96 bg-slate-900 text-white rounded-lg shadow-2xl overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
				<div className="flex items-center gap-2">
					<Code className="w-4 h-4 text-blue-400" />
					<span className="font-semibold text-sm">Platform Simulator</span>
				</div>
				<button
					type="button"
					onClick={onToggle}
					className="text-slate-400 hover:text-white"
				>
					×
				</button>
			</div>

			{/* Content */}
			<div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
				{/* Flow indicator */}
				<div className="text-xs text-slate-400 bg-slate-800 rounded p-2">
					Platform → RabbitMQ → SSE → Jarvis Chat
				</div>

				{/* Preset buttons */}
				<div>
					<div className="text-xs text-slate-400 mb-2">Select Schema:</div>
					<div className="flex flex-wrap gap-1">
						{Object.entries(DEMO_SCHEMAS).map(([key, { name }]) => (
							<button
								key={key}
								type="button"
								onClick={() => handlePresetChange(key)}
								className={`px-2 py-1 rounded text-xs ${
									selectedPreset === key && !useCustom
										? "bg-blue-600 text-white"
										: "bg-slate-700 text-slate-300 hover:bg-slate-600"
								}`}
							>
								{name.split(" ")[0]}
							</button>
						))}
						<button
							type="button"
							onClick={() => setUseCustom(true)}
							className={`px-2 py-1 rounded text-xs ${
								useCustom
									? "bg-blue-600 text-white"
									: "bg-slate-700 text-slate-300 hover:bg-slate-600"
							}`}
						>
							Custom
						</button>
					</div>
				</div>

				{/* JSON editor */}
				<div>
					<div className="text-xs text-slate-400 mb-1">JSON Schema:</div>
					<textarea
						className="w-full h-48 bg-slate-800 text-slate-200 text-xs font-mono p-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
						value={customJson}
						onChange={(e) => {
							setCustomJson(e.target.value);
							setUseCustom(true);
						}}
					/>
				</div>

				{/* Send button */}
				<button
					type="button"
					onClick={handleSendSchema}
					className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium text-sm flex items-center justify-center gap-2"
				>
					<Send className="w-4 h-4" />
					Send to Jarvis
				</button>

				{/* Last sent indicator */}
				{lastSentSchema && (
					<button
						type="button"
						onClick={onOpenActivityLog}
						className="w-full text-xs text-green-400 bg-green-900/30 hover:bg-green-900/50 rounded p-2 text-left transition-colors"
					>
						✓ Schema sent - click to view activity log
					</button>
				)}
			</div>
		</div>
	);
}

// Dev tools dropdown for input toolbar (shows when feature flag enabled OR mock mode)
function IframeDevTools({
	onDownloadConversation,
	onDownloadMetadata,
	onShowActivityLog,
	onShowPlatformSimulator,
	onShowValkeySession,
	isMockMode,
}: {
	onDownloadConversation: () => void;
	onDownloadMetadata: () => void;
	onShowActivityLog: () => void;
	onShowPlatformSimulator?: () => void;
	onShowValkeySession?: () => void;
	isMockMode?: boolean;
}) {
	const devToolsEnabled = useFeatureFlag("ENABLE_IFRAME_DEV_TOOLS");

	// Show if dev tools enabled OR in mock mode
	if (!devToolsEnabled && !isMockMode) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="icon"
					variant="ghost"
					className="h-8 w-8 hover:bg-accent cursor-pointer"
				>
					<Wrench className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side="top" className="w-56">
				{/* Demo Tools - available in mock mode OR dev tools */}
				<DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
					Demo Tools
				</DropdownMenuLabel>
				<DropdownMenuItem
					onClick={onShowPlatformSimulator}
					className="cursor-pointer"
				>
					<Code className="mr-2 h-4 w-4" />
					Platform Simulator
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={onShowActivityLog}
					className="cursor-pointer"
				>
					<ScrollText className="mr-2 h-4 w-4" />
					Activity Log
				</DropdownMenuItem>
				{/* Download tools - only when dev tools feature flag enabled */}
				{devToolsEnabled && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Inspect
						</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={onShowValkeySession}
							className="cursor-pointer"
						>
							<Database className="mr-2 h-4 w-4" />
							Valkey Session
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Downloads
						</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={onDownloadConversation}
							className="cursor-pointer"
						>
							<Download className="mr-2 h-4 w-4" />
							Conversation
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={onDownloadMetadata}
							className="cursor-pointer"
						>
							<Download className="mr-2 h-4 w-4" />
							Full Metadata
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// Debug panel component (moved outside to avoid nested component definition)
function DebugPanel({
	debug,
	showDebug,
	setShowDebug,
	debugLogs,
}: DebugPanelProps) {
	const logsEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new logs added
	const logCount = debugLogs.length;
	// biome-ignore lint/correctness/useExhaustiveDependencies: logCount triggers scroll on new logs
	useEffect(() => {
		if (showDebug && logsEndRef.current) {
			logsEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [logCount, showDebug]);

	if (!debug && !showDebug) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white text-xs z-50 max-h-64 overflow-hidden flex flex-col">
			<button
				type="button"
				onClick={() => setShowDebug(!showDebug)}
				className="flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700 cursor-pointer"
			>
				<span className="flex items-center gap-2">
					<Bug className="w-4 h-4" />
					Debug Panel ({debugLogs.length} logs)
				</span>
				{showDebug ? (
					<ChevronDown className="w-4 h-4" />
				) : (
					<ChevronUp className="w-4 h-4" />
				)}
			</button>
			{showDebug && (
				<div className="flex-1 overflow-auto p-2">
					{/* Activity Log - SSE & Webhooks only */}
					<div className="bg-gray-800 rounded p-2">
						<div className="font-semibold mb-1">Activity Log:</div>
						<div className="text-[9px] text-slate-500 mb-2 flex gap-3">
							<span>⬇️ SSE (Platform → Jarvis)</span>
							<span>⬆️ Webhook (Jarvis → Platform)</span>
						</div>
						<div className="space-y-1 max-h-40 overflow-auto">
							{debugLogs.map((log, i) => (
								<div
									key={`${log.timestamp}-${i}`}
									className={`text-[10px] ${
										log.level === "error"
											? "text-red-400"
											: log.level === "warn"
												? "text-yellow-400"
												: "text-green-400"
									}`}
								>
									<span className="text-gray-500">
										{log.timestamp.split("T")[1].split(".")[0]}
									</span>{" "}
									{log.message}
									{log.data ? (
										<pre className="ml-4 text-gray-400 overflow-x-auto">
											{JSON.stringify(log.data, null, 2)}
										</pre>
									) : null}
								</div>
							))}
							<div ref={logsEndRef} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Map RITA's message status to ai-elements ChatStatus (iframe variant)
 */
const mapRitaStatusToChatStatus = (
	isSending: boolean,
	isUploading: boolean,
	messages: RitaMessage[],
): ChatStatus => {
	if (isUploading || isSending) {
		return "submitted";
	}

	const hasProcessingMessage = messages.some(
		(msg) => msg.status === "processing" || msg.status === "pending",
	);
	if (hasProcessingMessage) {
		return "streaming";
	}

	const lastMessage = messages[messages.length - 1];
	if (lastMessage && lastMessage.role === "user") {
		const hasAssistantResponseAfter = messages.some(
			(msg) =>
				msg.role === "assistant" && msg.timestamp > lastMessage.timestamp,
		);
		if (!hasAssistantResponseAfter && lastMessage.status === "sent") {
			return "streaming";
		}
	}

	if (lastMessage && lastMessage.role === "assistant") {
		if (lastMessage.metadata?.turn_complete === false) {
			return "streaming";
		}
	}

	if (lastMessage && lastMessage.status === "failed") {
		return "error";
	}

	return "ready";
};

// Inner component that uses SSE (must be inside SSEProvider)
function IframeChatContent({
	conversationId,
	titleText,
	placeholderText,
	welcomeText,
	leftToolbarContent,
	onFormSubmit,
	onFormCancel,
}: {
	conversationId: string;
	/** Custom title from Valkey (e.g., "Ask Workflow Designer") */
	titleText?: string;
	/** Custom placeholder from Valkey (e.g., "Describe your workflow...") */
	placeholderText?: string;
	/** Custom welcome text from Valkey (e.g., "I can help you build workflow automations.") */
	welcomeText?: string;
	/** Custom content for left side of input toolbar */
	leftToolbarContent?: React.ReactNode;
	/** Handler for inline form submission */
	onFormSubmit?: (
		requestId: string,
		action: string,
		data: Record<string, string>,
	) => Promise<void>;
	/** Handler for inline form cancellation */
	onFormCancel?: (requestId: string) => Promise<void>;
}) {
	const { t } = useTranslation(["chat", "toast"]);
	const { latestUpdate } = useSSEContext();
	const { updateMessage, chatMessages } = useConversationStore();
	const ritaChatState = useRitaChat();

	// Timeout override state for incomplete turns
	const [timeoutOverride, setTimeoutOverride] = useState(false);
	const lastCheckedConvRef = useRef<string | null>(null);

	// Feature flags
	const enableMultiFileUpload = useFeatureFlag("ENABLE_MULTI_FILE_UPLOAD");

	// Handle SSE message updates
	useEffect(() => {
		if (latestUpdate) {
			updateMessage(latestUpdate.messageId, {
				status: latestUpdate.status,
				error_message: latestUpdate.errorMessage,
			});
		}
	}, [latestUpdate, updateMessage]);

	// Handle postMessage commands from host page (Jarvis)
	const handleHostSendMessage = useCallback(
		async (content: string, metadata: HostMessageMetadata) => {
			const apiMetadata: Record<string, string | boolean> = {};
			if (metadata.chatSessionId)
				apiMetadata.chatSessionId = metadata.chatSessionId;
			if (metadata.tabInstanceId)
				apiMetadata.tabInstanceId = metadata.tabInstanceId;
			await ritaChatState.sendMessageWithContent(content, apiMetadata);
		},
		[ritaChatState],
	);

	// Enable postMessage communication with host page
	useIframeMessaging({
		enabled: true,
		allowedOrigins: [], // Same-origin only for security
		onSendMessage: handleHostSendMessage,
		onGetStatus: () => ({
			conversationId,
			isSending: ritaChatState.isSending,
			messageCount: ritaChatState.messages.length,
		}),
	});

	// Scroll container ref for pagination
	const scrollContainerRef = useRef<HTMLElement | null>(null);

	const handleStickToBottomContext = useCallback((context: any) => {
		if (context?.scrollRef?.current) {
			scrollContainerRef.current = context.scrollRef.current;
		}
	}, []);

	// Pagination hook for infinite scroll
	const { sentinelRef, isLoadingMore, hasMore, hasPaginationAttempted } =
		useChatPagination({
			conversationId,
			scrollContainerRef,
			enabled: !!conversationId && chatMessages.length > 0,
		});

	// Determine chat status
	const chatStatus = mapRitaStatusToChatStatus(
		ritaChatState.isSending,
		ritaChatState.uploadStatus.isUploading,
		ritaChatState.messages,
	);

	// 30-second timeout for incomplete turns
	useEffect(() => {
		setTimeoutOverride(false);

		if (chatStatus === "streaming") {
			const timeoutId = setTimeout(() => {
				ritaToast.warning({ title: t("toast:warning.responseTimeout") });
				setTimeoutOverride(true);
			}, 30000);

			return () => clearTimeout(timeoutId);
		}
	}, [chatStatus, t]);

	// Check for incomplete conversation on navigation
	useEffect(() => {
		if (!conversationId || !ritaChatState.messages.length) return;
		if (lastCheckedConvRef.current === conversationId) return;
		lastCheckedConvRef.current = conversationId;

		const lastMsg = ritaChatState.messages[ritaChatState.messages.length - 1];
		const isIncomplete =
			lastMsg.role === "user" ||
			(lastMsg.role === "assistant" &&
				lastMsg.metadata?.turn_complete === false);

		if (isIncomplete) {
			setTimeoutOverride(true);
		}
	}, [conversationId, ritaChatState.messages]);

	// Determine if input should be disabled
	const isInputDisabled =
		!timeoutOverride &&
		(chatStatus === "streaming" || chatStatus === "submitted");

	// Handle form submission from PromptInput
	const handlePromptSubmit = useCallback(
		async (message: PromptInputMessage) => {
			const hasText = Boolean(message.text);
			const hasAttachments = Boolean(message.files?.length);

			if (!(hasText || hasAttachments)) return;

			if (message.text) {
				ritaChatState.handleMessageChange(message.text);
			}

			if (message.files && message.files.length > 0) {
				const fileEvent = {
					target: { files: message.files as any },
				} as React.ChangeEvent<HTMLInputElement>;
				ritaChatState.handleFileUpload(fileEvent);
			}

			setTimeout(async () => {
				await ritaChatState.handleSendMessage();
			}, 0);
		},
		[ritaChatState],
	);

	return (
		<div className="h-full flex flex-col relative">
			<Conversation className="flex-1" contextRef={handleStickToBottomContext}>
				<ConversationContent className="px-6 py-6">
					<div className="max-w-4xl mx-auto">
						{ritaChatState.messagesLoading ? (
							<div className="flex items-center justify-center h-full">
								<Loader size={24} />
							</div>
						) : chatMessages.length === 0 ? (
							<div className="min-h-[60vh] flex items-center justify-center">
								<div className="text-center max-w-md px-4">
									<h2 className="text-2xl font-semibold text-gray-900 mb-2">
										{titleText ?? t("chat:emptyState.title")}
									</h2>
									<p className="text-sm text-gray-600">
										{welcomeText ?? t("chat:emptyState.guestDescription")}
									</p>
								</div>
							</div>
						) : (
							<>
								{/* Intersection Observer sentinel for infinite scroll */}
								<div ref={sentinelRef} className="h-1" />

								{/* Loading indicator for pagination */}
								{isLoadingMore && (
									<div className="flex justify-center py-4">
										<Loader size={16} />
										<span className="ml-2 text-sm text-gray-500">
											{t("chat:messages.loadingOlder")}
										</span>
									</div>
								)}

								{/* "Beginning of conversation" indicator */}
								{!hasMore &&
									!isLoadingMore &&
									chatMessages.length > 0 &&
									hasPaginationAttempted && (
										<div className="flex justify-center py-4">
											<span className="text-sm text-gray-400">
												{t("chat:messages.beginningOfConversation")}
											</span>
										</div>
									)}

								{/* Render messages via ChatV2Content */}
								<ChatV2Content
									conversationId={conversationId}
									onFormSubmit={onFormSubmit}
									onFormCancel={onFormCancel}
								/>
							</>
						)}
					</div>
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			{/* Chat input */}
			<ChatInput
				value={ritaChatState.messageValue}
				placeholder={placeholderText ?? t("chat:input.placeholder")}
				chatStatus={chatStatus}
				disabled={isInputDisabled}
				showNoKnowledgeWarning={false}
				isAdmin={false}
				onChange={ritaChatState.handleMessageChange}
				onSubmit={handlePromptSubmit}
				fileUpload={{
					accept: undefined,
					multiple: false,
					maxFiles: undefined,
					maxFileSize: undefined,
				}}
				leftToolbarContent={leftToolbarContent}
			/>

			{/* Hidden file input for chat message attachments */}
			<input
				ref={ritaChatState.fileInputRef}
				type="file"
				className="hidden"
				onChange={ritaChatState.handleFileUpload}
				accept={SUPPORTED_DOCUMENT_TYPES}
				disabled={ritaChatState.uploadStatus.isUploading}
				multiple={enableMultiFileUpload}
			/>
		</div>
	);
}

export default function IframeChatPage() {
	const { t } = useTranslation("chat");
	const { conversationId: urlConversationId } = useParams<{
		conversationId?: string;
	}>();
	const [searchParams] = useSearchParams();
	const sessionKey = searchParams.get("sessionKey");
	const debug = searchParams.get("debug") === "true";
	const mockMode = searchParams.get("mock") === "true";
	// Dev mode: mock mode OR using dev/demo session keys (for iframe-app testing)
	const isDevMode =
		mockMode ||
		sessionKey?.startsWith("dev-") ||
		sessionKey?.startsWith("demo-");

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(
		urlConversationId || null,
	);
	const [sessionReady, setSessionReady] = useState(false);

	// Custom UI text from Valkey (undefined = use i18n defaults)
	const [titleText, setTitleText] = useState<string | undefined>();
	const [placeholderText, setPlaceholderText] = useState<string | undefined>();
	const [welcomeText, setWelcomeText] = useState<string | undefined>();

	// Full Valkey payload for dev tools export (JAR-69)
	const [valkeyPayload, setValkeyPayload] = useState<ValkeyPayload | null>(
		null,
	);

	// Initialize platform feature flags for iframe (uses tenantId from valkeyPayload)
	const flagsStore = useFeatureFlagsStore();
	const tenantId = valkeyPayload?.tenantId as string | undefined;
	useEffect(() => {
		if (tenantId && !flagsStore.initialized) {
			flagsStore.initialize(tenantId);
		}
	}, [tenantId, flagsStore]);

	// Clear trusted origin on unmount to prevent stale origin across SPA navigations
	useEffect(() => {
		return () => resetHostOrigin();
	}, []);

	// Debug state
	const [showDebug, setShowDebug] = useState(debug);
	const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

	// Mock platform panel state (only in mock mode - backend is skipped)
	const [showPlatformPanel, setShowPlatformPanel] = useState(mockMode);
	const [showValkeyPanel, setShowValkeyPanel] = useState(false);

	const navigate = useNavigate();
	const apiUrl = import.meta.env.VITE_API_URL || "";
	const { setCurrentConversation } = useConversationStore();
	const initRef = useRef(false);
	const workflowExecutedRef = useRef(false);

	// Debug logging helper
	const addDebugLog = useCallback(
		(
			level: DebugLogEntry["level"],
			message: string,
			data?: Record<string, unknown>,
		) => {
			const entry: DebugLogEntry = {
				timestamp: new Date().toISOString(),
				level,
				message,
				data,
			};
			setDebugLogs((prev) => [...prev, entry]);
			// Also log to console
			const consoleFn =
				level === "error"
					? console.error
					: level === "warn"
						? console.warn
						: console.log;
			consoleFn(`[IframeDebug] ${message}`, data || "");
		},
		[],
	);

	// Helper to trigger file download
	const triggerDownload = useCallback((data: object, filename: string) => {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	// Download simple conversation (JAR-69)
	const downloadConversation = useCallback(() => {
		const messages = useConversationStore.getState().messages;
		const data = {
			conversationId,
			transcript: messages
				.filter(
					(m) =>
						!m.metadata?.sources && !m.metadata?.reasoning && m.message?.trim(),
				)
				.map((m) => `${m.role === "user" ? "User" : "Bot"}: ${m.message}`),
		};
		triggerDownload(data, `conversation-${conversationId}.json`);
	}, [conversationId, triggerDownload]);

	// Download full metadata (JAR-69)
	// TODO: CLIEN-20 Clean up debugging payloads
	const downloadMetadata = useCallback(async () => {
		// Re-read Valkey for fresh context (Actions Platform may have updated runId/activityId)
		let freshPayload = valkeyPayload;
		if (sessionKey) {
			try {
				const resp = await fetch(
					`${apiUrl}/api/iframe/session-context?sessionKey=${encodeURIComponent(sessionKey)}`,
				);
				if (resp.ok) freshPayload = await resp.json();
			} catch {
				/* fall back to cached payload */
			}
		}

		const messages = useConversationStore.getState().messages;
		const data = {
			exportedAt: new Date().toISOString(),
			conversationId,
			sessionKey,
			// Fresh Valkey payload (sensitive fields excluded by backend)
			valkeyPayload: freshPayload,
			// Debug info
			debug: {
				apiUrl,
				logs: debugLogs,
			},
			// Full message objects
			messages: messages.map((m) => ({
				id: m.id,
				role: m.role,
				message: m.message,
				timestamp: m.timestamp,
				status: m.status,
				metadata: m.metadata,
			})),
		};
		triggerDownload(data, `metadata-${conversationId}-${Date.now()}.json`);
	}, [conversationId, sessionKey, valkeyPayload, debugLogs, triggerDownload]);

	// Clear chat handler - deletes conversation and creates a new one
	const handleClearChat = useCallback(async () => {
		if (!conversationId || !sessionKey) return;

		// Confirm with user
		if (!window.confirm("Clear all messages? This cannot be undone.")) return;

		try {
			addDebugLog("info", "Clearing chat...", { conversationId });

			// Delete current conversation
			await iframeApi.deleteConversation(conversationId);

			// Clear local state
			useConversationStore.getState().clearCurrentConversation();
			setDebugLogs([]);

			// Reset refs to allow re-initialization
			initRef.current = false;
			workflowExecutedRef.current = false;

			// Re-initialize to get new conversation (don't pass existingConversationId)
			const response = await iframeApi.validateInstantiation({ sessionKey });

			if (response.valid && response.conversationId) {
				setConversationId(response.conversationId);
				setCurrentConversation(response.conversationId);

				// Navigate to new conversation URL
				const params = new URLSearchParams(window.location.search);
				navigate(`/iframe/chat/${response.conversationId}?${params}`, {
					replace: true,
				});

				addDebugLog("info", "Chat cleared, new conversation created", {
					newConversationId: response.conversationId,
				});
			} else {
				addDebugLog("error", "Failed to create new conversation", {
					error: response.error,
				});
			}
		} catch (err) {
			addDebugLog("error", "Failed to clear chat", { error: String(err) });
		}
	}, [
		conversationId,
		sessionKey,
		navigate,
		setCurrentConversation,
		addDebugLog,
	]);

	// Initialize iframe session on mount (always required for auth)
	useEffect(() => {
		// Guard against StrictMode double-mount
		if (initRef.current) return;
		initRef.current = true;

		// Capture apiUrl in closure for logging
		const currentApiUrl = apiUrl;

		async function initializeIframe() {
			addDebugLog("info", "Starting initialization", {
				sessionKey: sessionKey ? `${sessionKey.substring(0, 8)}...` : "null",
				existingConversationId: urlConversationId || "null",
				apiUrl: currentApiUrl,
				mockMode,
			});

			// Mock mode: skip backend entirely for demo/testing
			if (mockMode) {
				addDebugLog("info", "Mock mode enabled - skipping backend");
				const mockConversationId = `mock-conv-${Date.now()}`;
				setConversationId(mockConversationId);
				setCurrentConversation(mockConversationId);
				setTitleText("UI Schema Demo (Mock Mode)");
				setWelcomeText(
					"This is running without a backend. Try the schema renderer demo at /demo/schema-renderer",
				);
				setSessionReady(true);
				setIsLoading(false);
				return;
			}

			// sessionKey is required
			if (!sessionKey) {
				addDebugLog("error", "Missing sessionKey parameter");
				setError(t("iframe.missingSessionKey"));
				setIsLoading(false);
				return;
			}

			try {
				addDebugLog("info", "Calling validate-instantiation API...");
				const startTime = Date.now();

				// Always call validate-instantiation to get session cookie
				// Pass existing conversationId to skip creating a new one
				const response = await iframeApi.validateInstantiation({
					sessionKey,
					existingConversationId: urlConversationId,
				});

				const duration = Date.now() - startTime;
				addDebugLog("info", `API response received (${duration}ms)`, {
					...response,
				});

				if (response.valid && response.conversationId) {
					addDebugLog("info", "Session initialized successfully", {
						conversationId: response.conversationId,
						webhookConfigLoaded: response.webhookConfigLoaded,
						titleText: response.titleText,
						welcomeText: response.welcomeText,
						placeholderText: response.placeholderText,
					});
					setConversationId(response.conversationId);
					setCurrentConversation(response.conversationId);

					// Store custom UI text from Valkey (undefined = use i18n defaults)
					setTitleText(response.titleText);
					setWelcomeText(response.welcomeText);
					setPlaceholderText(response.placeholderText);

					// Store trusted host origin from Valkey for secure postMessage
					if (response.parentOrigin) {
						setHostOrigin(response.parentOrigin);
					}

					// Store full Valkey payload for dev tools export (JAR-69)
					if (response.valkeyPayload) {
						setValkeyPayload(response.valkeyPayload);
					}

					// Navigate to URL with conversationId to sync with useChatNavigation
					// This prevents useChatNavigation from clearing the store when URL has no conversationId
					if (!urlConversationId) {
						const params = new URLSearchParams(window.location.search);
						const newUrl = `/iframe/chat/${response.conversationId}${params.toString() ? `?${params}` : ""}`;
						navigate(newUrl, { replace: true });
					}

					setSessionReady(true);
				} else {
					addDebugLog("error", "Validation failed", { ...response });
					setError(response.error || "Failed to initialize session");
				}
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				const errorStack = err instanceof Error ? err.stack : undefined;
				addDebugLog("error", "Initialization exception", {
					error: errorMsg,
					stack: errorStack || "no stack",
				});
				// Provide specific error message based on error type
				let userError = "Failed to connect to server";
				if (errorMsg.includes("fetch") || errorMsg.includes("network")) {
					userError = `Network error: API server not reachable at ${currentApiUrl}`;
				} else if (errorMsg.includes("CORS")) {
					userError = "CORS error: API server blocking cross-origin requests";
				} else if (errorMsg.includes("timeout")) {
					userError = "Connection timeout: Server took too long to respond";
				} else {
					userError = `Connection failed: ${errorMsg}`;
				}
				setError(userError);
			} finally {
				setIsLoading(false);
				addDebugLog("info", "Initialization complete", { isLoading: "false" });
			}
		}

		initializeIframe();
	}, [
		urlConversationId,
		sessionKey,
		setCurrentConversation,
		addDebugLog,
		navigate,
		t,
		mockMode,
	]);

	// Listen for UI action events (dev mode) to log to debug panel
	useEffect(() => {
		if (!isDevMode) return;

		const handleUIAction = (event: CustomEvent) => {
			const payload = event.detail;
			addDebugLog("info", "⬆️ Webhook sent to Platform", {
				event: payload.action,
				data: payload.data,
				messageId: payload.messageId,
				conversationId: payload.conversationId,
			});
		};

		window.addEventListener("rita:ui-action", handleUIAction as EventListener);
		return () => {
			window.removeEventListener(
				"rita:ui-action",
				handleUIAction as EventListener,
			);
		};
	}, [isDevMode, addDebugLog]);

	// Listen for open activity log events (from toast action button)
	useEffect(() => {
		const handleOpenActivityLog = () => {
			setShowDebug(true);
		};

		window.addEventListener("rita:open-activity-log", handleOpenActivityLog);
		return () => {
			window.removeEventListener(
				"rita:open-activity-log",
				handleOpenActivityLog,
			);
		};
	}, []);

	// Execute workflow once session is ready
	// This runs in parent to prevent re-execution on child remounts
	useEffect(() => {
		if (!sessionReady || !sessionKey || workflowExecutedRef.current) return;
		workflowExecutedRef.current = true;

		const key = sessionKey; // Capture for closure (narrowed type)
		async function executeWorkflow() {
			console.log("[IframeChatPage] Executing workflow from sessionKey...");
			try {
				const result = await iframeApi.executeWorkflow(key);
				if (result.success) {
					console.log(
						"[IframeChatPage] Workflow executed, eventId:",
						result.eventId,
					);
				} else {
					console.error(
						"[IframeChatPage] Workflow execution failed:",
						result.error,
					);
				}
			} catch (err) {
				console.error("[IframeChatPage] Workflow execution error:", err);
			}
		}

		executeWorkflow();
	}, [sessionReady, sessionKey]);

	// Debug panel props
	const debugPanelProps: DebugPanelProps = {
		debug,
		showDebug,
		setShowDebug,
		debugLogs,
	};

	// UI Form Request handlers (must be before early returns for hooks rules)
	const handleFormSubmit = useCallback(
		async (requestId: string, action: string, data: Record<string, string>) => {
			addDebugLog("info", "⬆️ UI Form submitted", { requestId, action, data });
			await iframeApi.submitUIFormResponse({
				requestId,
				action,
				status: "submitted",
				data,
			});
		},
		[addDebugLog],
	);

	const handleFormCancel = useCallback(
		async (requestId: string) => {
			addDebugLog("info", "⬆️ UI Form cancelled", { requestId });
			await iframeApi.submitUIFormResponse({ requestId, status: "cancelled" });
		},
		[addDebugLog],
	);

	// Listen for FORM_MODAL_SUBMITTED / FORM_MODAL_CANCELLED from host embed script (Tier 1)
	useEffect(() => {
		const handler = async (event: MessageEvent) => {
			const msg = event.data;
			if (!msg || typeof msg !== "object") return;

			if (msg.type === "FORM_MODAL_SUBMITTED" && msg.requestId) {
				addDebugLog("info", "⬇️ Host form submitted", {
					requestId: msg.requestId,
					action: msg.action,
				});
				await iframeApi.submitUIFormResponse({
					requestId: msg.requestId,
					action: msg.action,
					status: "submitted",
					data: msg.data,
				});
				// Update local store to mark form as completed
				const { messages: storeMessages, updateMessage: storeUpdate } =
					useConversationStore.getState();
				const formMsg = storeMessages.find(
					(m) => m.metadata?.request_id === msg.requestId,
				);
				if (formMsg) {
					storeUpdate(formMsg.id, {
						metadata: {
							...formMsg.metadata,
							status: "completed",
							form_data: msg.data,
							form_action: msg.action,
							submitted_at: new Date().toISOString(),
						},
					});
				}
			} else if (msg.type === "FORM_MODAL_CANCELLED" && msg.requestId) {
				addDebugLog("info", "⬇️ Host form cancelled", {
					requestId: msg.requestId,
				});
				await iframeApi.submitUIFormResponse({
					requestId: msg.requestId,
					status: "cancelled",
				});
				// Update local store to mark form as cancelled
				const { messages: cancelMessages, updateMessage: cancelUpdate } =
					useConversationStore.getState();
				const cancelMsg = cancelMessages.find(
					(m) => m.metadata?.request_id === msg.requestId,
				);
				if (cancelMsg) {
					cancelUpdate(cancelMsg.id, {
						metadata: {
							...cancelMsg.metadata,
							status: "cancelled",
							submitted_at: new Date().toISOString(),
						},
					});
				}
			}
		};

		window.addEventListener("message", handler);
		return () => window.removeEventListener("message", handler);
	}, [addDebugLog]);

	// Loading state
	if (isLoading) {
		return (
			<IframeChatLayout>
				<div className="flex items-center justify-center h-full">
					<Loader size={32} />
				</div>
				<DebugPanel {...debugPanelProps} />
			</IframeChatLayout>
		);
	}

	// Error state
	if (error) {
		return (
			<IframeChatLayout>
				<div className="flex items-center justify-center h-full">
					<div className="text-center max-w-md px-4">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							{t("iframe.setupFailed")}
						</h2>
						<p className="text-sm text-gray-600">{error}</p>
					</div>
				</div>
				<DebugPanel {...debugPanelProps} />
			</IframeChatLayout>
		);
	}

	// Not ready state (shouldn't happen, but safety check)
	if (!sessionReady || !conversationId) {
		return (
			<IframeChatLayout>
				<div className="flex items-center justify-center h-full">
					<div className="text-sm text-gray-500">
						{t("iframe.initializing")}
					</div>
				</div>
				<DebugPanel {...debugPanelProps} />
			</IframeChatLayout>
		);
	}

	// Dev tools element for input toolbar
	const devToolsElement = (
		<>
			<IframeClearChat onClear={handleClearChat} />
			<IframeDevTools
				onDownloadConversation={downloadConversation}
				onDownloadMetadata={downloadMetadata}
				onShowActivityLog={() => setShowDebug(true)}
				onShowPlatformSimulator={() => setShowPlatformPanel(true)}
				onShowValkeySession={() => setShowValkeyPanel(true)}
				isMockMode={isDevMode}
			/>
		</>
	);

	// Render chat with SSE provider (session cookie enables SSE auth)
	return (
		<IframeChatLayout>
			<SSEProvider apiUrl={apiUrl} enabled={sessionReady && !mockMode}>
				<IframeChatContent
					conversationId={conversationId}
					titleText={titleText}
					placeholderText={placeholderText}
					welcomeText={welcomeText}
					leftToolbarContent={devToolsElement}
					onFormSubmit={handleFormSubmit}
					onFormCancel={handleFormCancel}
				/>
			</SSEProvider>
			{/* Platform simulator panel (dev mode) */}
			{isDevMode && conversationId && (
				<MockPlatformPanel
					conversationId={conversationId}
					isOpen={showPlatformPanel}
					onToggle={() => setShowPlatformPanel((v) => !v)}
					onLog={addDebugLog}
					onOpenActivityLog={() => setShowDebug(true)}
				/>
			)}
			<DebugPanel {...debugPanelProps} />
			{showValkeyPanel && sessionKey && (
				<ValkeySessionPanel
					sessionKey={sessionKey}
					apiUrl={apiUrl}
					initialPayload={valkeyPayload}
					onClose={() => setShowValkeyPanel(false)}
				/>
			)}
		</IframeChatLayout>
	);
}
