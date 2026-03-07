import {
	ChevronDown,
	ChevronRight,
	Copy,
	ExternalLink,
	Loader2,
	SendHorizontal,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
	Maximize2,
	Minus,
	Move,
	Pen,
	Play,
	Plus,
	Printer,
	RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProLayout } from "@/components/layouts/ProLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { MOCK_PRO_RUNBOOKS } from "@/data/mock-pro";

type DesignerTab = "main" | "abort";
type ViewTab = "page" | "automation" | "decision-tree";
type PropsTab = "configure" | "view" | "jarvis";
type ParamsTab = "input" | "output";

interface FlowNode {
	id: string;
	type: "start" | "task" | "decision" | "comment";
	label: string;
	sublabel?: string;
	x: number;
	y: number;
	selected?: boolean;
}

interface FlowGroup {
	id: string;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
	nodes: FlowNode[];
}

interface TaskParam {
	name: string;
	source: string;
	value: string;
}

interface TaskConfig {
	id: string;
	displayName: string;
	taskName: string;
	merge: string;
	params: TaskParam[];
}

const TASK_CONFIGS: TaskConfig[] = [
	{
		id: "parse-interface",
		displayName: "parse interface name",
		taskName: "parse interface name#se.tellabs",
		merge: "ALL",
		params: [
			{ name: "INTERFACE_NAME", source: "DEFAULT", value: "$INPUT(interface_name)" },
			{ name: "PARSE_MODE", source: "DEFAULT", value: "regex" },
		],
	},
	{
		id: "get-site",
		displayName: "get site",
		taskName: "get site#se.nokia.5620sam",
		merge: "ALL",
		params: [
			{ name: "SITE_ID", source: "DEFAULT", value: "10.246.222.20" },
			{ name: "NOKIA_5620_SAM_URL", source: "DEFAULT", value: "$PROPERTY(NOKIA_5620_SAM_URL)" },
			{ name: "NOKIA_5620_SAM_USERNAME", source: "DEFAULT", value: "$PROPERTY(NOKIA_5620_SAM_USERNAME)" },
			{ name: "NOKIA_5620_SAM_PASSWORD", source: "DEFAULT", value: "$PROPERTY(NOKIA_5620_SAM_PASSWORD)" },
		],
	},
	{
		id: "get-port",
		displayName: "get equipment physical port details",
		taskName: "get equipment physical port details#se.nokia.5620sam",
		merge: "ALL",
		params: [
			{ name: "EQUIPMENT_NAME", source: "DEFAULT", value: "$OUTPUT(get_site.equipmentName)" },
			{ name: "PORT_ID", source: "DEFAULT", value: "$INPUT(port_id)" },
			{ name: "NOKIA_5620_SAM_URL", source: "DEFAULT", value: "$PROPERTY(NOKIA_5620_SAM_URL)" },
			{ name: "NOKIA_5620_SAM_USERNAME", source: "DEFAULT", value: "$PROPERTY(NOKIA_5620_SAM_USERNAME)" },
			{ name: "NOKIA_5620_SAM_PASSWORD", source: "DEFAULT", value: "$PROPERTY(NOKIA_5620_SAM_PASSWORD)" },
		],
	},
];

// --- Jarvis Chat ---

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
}

const DEMO_RESPONSES: string[] = [
	"This task calls the Nokia 5620 SAM REST API at the `NOKIA_5620_SAM_URL` endpoint to retrieve site details for `SITE_ID` = `10.246.222.20`.\n\nThe API call is:\n```\nGET /nbi/api/v1/site/{siteId}\nAuthorization: Bearer <token>\n```\n\nIt returns the site's equipment name, IP assignments, and associated CIs. The response is passed downstream so the decision node can compare the loopback IP against the equipment name.",

	"Here are the 4 input variables for this task:\n\n• **SITE_ID** (`10.246.222.20`) — The target site IP. This is the primary lookup key for the SAM query.\n\n• **NOKIA_5620_SAM_URL** — The SAM API base URL. Uses `$PROPERTY()` so it's pulled from server config at runtime.\n\n• **NOKIA_5620_SAM_USERNAME** — Service account for SAM authentication. Check that this account has `read` permissions on the NBI API.\n\n• **NOKIA_5620_SAM_PASSWORD** — Credential for the service account. If this was recently rotated, the task will hang instead of returning a clean 401.",

	"The SAM API response for `get site` looks like this:\n\n```json\n{\n  \"siteId\": \"10.246.222.20\",\n  \"siteName\": \"CO-MPT-WEST-03\",\n  \"equipmentName\": \"NOKIA-7750-SR12\",\n  \"loopbackIp\": \"10.246.222.20\",\n  \"adminState\": \"up\",\n  \"managedElement\": {\n    \"meId\": \"172.16.50.12\",\n    \"neType\": \"7750 SR\"\n  }\n}\n```\n\nThe key fields downstream are `equipmentName` (compared in the decision node) and `loopbackIp` (validated against `SITE_ID`). If the response is empty, the task fails with a `SITE_NOT_FOUND` error.",

	"To debug the timeout, I'd check this task specifically:\n\n1. **Test the API call directly** — Run `curl -s -o /dev/null -w '%{time_total}' https://<SAM_URL>/nbi/api/v1/site/10.246.222.20` from the Resolve control node. If it takes >10s, it's a SAM-side issue.\n\n2. **Check the credentials** — An expired `NOKIA_5620_SAM_PASSWORD` causes SAM to hold the connection open instead of rejecting it. Verify the password hasn't been rotated.\n\n3. **Increase the task timeout** — The default is 30s. For SAM under load, set it to 60s in the task's advanced settings.",

	"Here's how to write a retry wrapper for this task:\n\n```python\nmax_retries = 3\nbackoff = 5  # seconds\n\nfor attempt in range(max_retries):\n    response = call_sam_api(\n        url=NOKIA_5620_SAM_URL,\n        site_id=SITE_ID,\n        auth=(USERNAME, PASSWORD)\n    )\n    if response.status == 200:\n        return response.json()\n    if response.status >= 500:\n        sleep(backoff * (attempt + 1))\n        continue\n    raise TaskError(f\"SAM returned {response.status}\")\n```\n\nThis handles transient 5xx errors from SAM without failing the whole runbook. Non-5xx errors fail immediately.",

	"The output of this task feeds into the decision node. Here's what gets passed:\n\n• `site.equipmentName` → compared against the loopback IP hostname\n• `site.loopbackIp` → validated to match `SITE_ID`\n• `site.adminState` → must be `up` for the check to pass\n\nIf you need additional fields from the SAM response (like `managedElement.neType`), add them as output variables in the task config and they'll be available to downstream nodes.",

	"To convert this task to use a different SAM API version, update the endpoint:\n\n**Current (v1):**\n`GET /nbi/api/v1/site/{siteId}`\n\n**New (v2):**\n`POST /nbi/api/v2/sites/query`\n```json\n{\n  \"filter\": { \"siteId\": \"10.246.222.20\" },\n  \"fields\": [\"equipmentName\", \"loopbackIp\", \"adminState\"]\n}\n```\n\nThe v2 API is faster because it only returns requested fields instead of the full site object. You'd also need to change the auth from Bearer token to **OAuth client credentials** — update the `authType` in the task config.",
];

function JarvisChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const responseIndex = useRef(0);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isTyping]);

	const handleSend = () => {
		const text = input.trim();
		if (!text || isTyping) return;

		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: text,
		};
		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setIsTyping(true);

		// Simulate typing delay then respond
		setTimeout(() => {
			const response = DEMO_RESPONSES[responseIndex.current % DEMO_RESPONSES.length];
			responseIndex.current += 1;
			const assistantMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: response,
			};
			setMessages((prev) => [...prev, assistantMsg]);
			setIsTyping(false);
		}, 1500);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Messages */}
			<div className="flex-1 overflow-auto p-3 space-y-3">
				{messages.length === 0 && !isTyping && (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-4">
						<p className="text-xs text-center">Ask Jarvis about this task</p>
					</div>
				)}
				{messages.map((msg) => (
					<div key={msg.id}>
						{msg.role === "user" ? (
							<div className="flex justify-end">
								<div className="bg-neutral-50 rounded-md px-3 py-2 max-w-[85%]">
									<p className="text-sm">{msg.content}</p>
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<div className="bg-blue-50 rounded-sm px-3 py-2">
									<p className="text-sm whitespace-pre-line" dangerouslySetInnerHTML={{
										__html: msg.content
											.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
											.replace(/`(.*?)`/g, "<code class='bg-blue-100 px-1 rounded text-xs'>$1</code>")
											.replace(/• /g, "• ")
									}} />
								</div>
								<div className="flex items-center gap-2.5 px-1">
									<button type="button" className="text-muted-foreground hover:text-foreground">
										<Copy className="size-3.5" />
									</button>
									<button type="button" className="text-muted-foreground hover:text-foreground">
										<ThumbsUp className="size-3.5" />
									</button>
									<button type="button" className="text-muted-foreground hover:text-foreground">
										<ThumbsDown className="size-3.5" />
									</button>
								</div>
							</div>
						)}
					</div>
				))}
				{isTyping && (
					<div className="flex items-center gap-2 px-1">
						<Loader2 className="size-3.5 animate-spin text-muted-foreground" />
						<span className="text-xs text-muted-foreground">Thinking...</span>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="p-2 border-t">
				<div className="flex items-center border border-blue-600 rounded-md px-3 py-1.5">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask about this task..."
						className="flex-1 text-sm bg-transparent outline-none placeholder:text-neutral-400"
						aria-label="Chat with Jarvis"
					/>
					<button
						type="button"
						onClick={handleSend}
						disabled={isTyping || !input.trim()}
						className="bg-blue-50 rounded-md p-1.5 text-blue-600 hover:bg-blue-100 disabled:opacity-40"
						aria-label="Send message"
					>
						<SendHorizontal className="size-4" />
					</button>
				</div>
			</div>
		</div>
	);
}

// --- SVG Canvas Nodes ---

function StartNode({ x, y }: { x: number; y: number }) {
	return (
		<g transform={`translate(${x}, ${y})`}>
			<circle r={18} fill="#4ade80" stroke="#22c55e" strokeWidth={1.5} />
			<rect x={-5} y={-6} width={12} height={12} rx={2} fill="white" />
			<text y={32} textAnchor="middle" fontSize={11} fill="#334155">Start</text>
		</g>
	);
}

function TaskNode({ x, y, label, sublabel, selected, onClick }: { x: number; y: number; label: string; sublabel?: string; selected?: boolean; onClick?: () => void }) {
	const w = 180;
	const h = 44;
	return (
		<g transform={`translate(${x}, ${y})`} onClick={onClick} className={onClick ? "cursor-pointer" : ""}>
			{/* Shadow */}
			<rect x={-w / 2 + 2} y={2} width={w} height={h} rx={4} fill="#00000008" />
			{/* Card */}
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill="white" stroke={selected ? "#0ec0c0" : "#d1d5db"} strokeWidth={selected ? 2 : 1} />
			{/* Icon badge */}
			<rect x={-w / 2 + 8} y={-h / 2 + 8} width={28} height={28} rx={4} fill="#1e6bb8" />
			<text x={-w / 2 + 22} y={-h / 2 + 26} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">N</text>
			{/* Label */}
			<text x={-w / 2 + 44} y={sublabel ? -3 : 4} fontSize={11} fontWeight={500} fill="#1e293b">{label}</text>
			{sublabel && <text x={-w / 2 + 44} y={13} fontSize={10} fill="#64748b">{sublabel}</text>}
		</g>
	);
}

function ActionTaskNode({ x, y, label, sublabel, selected, onClick }: { x: number; y: number; label: string; sublabel?: string; selected?: boolean; onClick?: () => void }) {
	const w = 180;
	const h = 44;
	return (
		<g transform={`translate(${x}, ${y})`} onClick={onClick} className={onClick ? "cursor-pointer" : ""}>
			<rect x={-w / 2 + 2} y={2} width={w} height={h} rx={4} fill="#00000008" />
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill="white" stroke={selected ? "#0ec0c0" : "#d1d5db"} strokeWidth={selected ? 2 : 1} />
			{/* Icon badge — dark blue arrow */}
			<rect x={-w / 2 + 8} y={-h / 2 + 8} width={28} height={28} rx={4} fill="#1e3a5f" />
			<text x={-w / 2 + 22} y={-h / 2 + 27} textAnchor="middle" fontSize={14} fill="white">↗</text>
			<text x={-w / 2 + 44} y={sublabel ? -3 : 4} fontSize={11} fontWeight={500} fill="#1e293b">{label}</text>
			{sublabel && <text x={-w / 2 + 44} y={13} fontSize={10} fill="#64748b">{sublabel}</text>}
		</g>
	);
}

function DecisionNode({ x, y, label }: { x: number; y: number; label: string }) {
	return (
		<g transform={`translate(${x}, ${y})`}>
			<polygon points="0,-16 16,0 0,16 -16,0" fill="#fbbf24" stroke="#f59e0b" strokeWidth={1.5} />
			<text x={24} y={5} fontSize={11} fill="#334155">{label}</text>
		</g>
	);
}

function CommentNode({ x, y, label, sublabel }: { x: number; y: number; label: string; sublabel?: string }) {
	const w = 140;
	const h = 40;
	return (
		<g transform={`translate(${x}, ${y})`}>
			<rect x={-w / 2 + 2} y={2} width={w} height={h} rx={4} fill="#00000008" />
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
			{/* Chat bubble icon */}
			<circle cx={-w / 2 + 22} cy={0} r={12} fill="#d97706" />
			<text x={-w / 2 + 22} y={4} textAnchor="middle" fontSize={10} fill="white">···</text>
			<text x={-w / 2 + 40} y={-4} fontSize={10} fontWeight={600} fill="#334155">{label}</text>
			{sublabel && <text x={-w / 2 + 40} y={10} fontSize={9} fill="#64748b">{sublabel}</text>}
		</g>
	);
}

function Arrow({ x1, y1, x2, y2, color = "#ef4444" }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
	const markerId = color === "#22c55e" ? "arrow-green" : "arrow-red";
	if (x1 === x2) {
		return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} markerEnd={`url(#${markerId})`} />;
	}
	// L-shaped or Z-shaped connector
	const midY = (y1 + y2) / 2;
	return (
		<path
			d={`M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}`}
			fill="none" stroke={color} strokeWidth={1.5} markerEnd={`url(#${markerId})`}
		/>
	);
}

// Red line that runs along the right edge of a group box
function GroupRedEdge({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
	return <line x1={x} y1={y1} x2={x} y2={y2} stroke="#ef4444" strokeWidth={2} />;
}

export default function RunbookDesignerPage() {
	const { id } = useParams<{ id: string }>();
	const runbook = MOCK_PRO_RUNBOOKS.find((rb) => rb.id === id);
	const name = runbook?.name ?? "se.network.Provision Co-MPT Validation";

	const [designerTab, setDesignerTab] = useState<DesignerTab>("main");
	const [viewTab, setViewTab] = useState<ViewTab>("automation");
	const [propsTab, setPropsTab] = useState<PropsTab>("configure");
	const [selectedTaskId, setSelectedTaskId] = useState<string>("get-site");
	const selectedTask = TASK_CONFIGS.find((t) => t.id === selectedTaskId) ?? TASK_CONFIGS[1];
	const [paramsTab, setParamsTab] = useState<ParamsTab>("input");

	return (
		<ProLayout>
			<div className="flex flex-col h-[calc(100vh-3rem)]">
				{/* Top bar: runbook name + view tabs */}
				<div className="flex items-center justify-between border-b px-4 py-2">
					<div className="flex items-center gap-2">
						<span className="font-semibold text-sm">{name}</span>
						<span className="text-xs text-muted-foreground">(v.10)</span>
						<span className="text-xs text-muted-foreground">(read-only)</span>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-1 text-sm">
							<button
								type="button"
								onClick={() => setViewTab("page")}
								className={`px-2 py-1 ${viewTab === "page" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
							>
								Page
							</button>
							<button
								type="button"
								onClick={() => setViewTab("automation")}
								className={`px-2 py-1 ${viewTab === "automation" ? "text-foreground font-medium underline underline-offset-4 decoration-[#0ec0c0] decoration-2" : "text-muted-foreground hover:text-foreground"}`}
							>
								Automation
							</button>
							<button
								type="button"
								onClick={() => setViewTab("decision-tree")}
								className={`px-2 py-1 ${viewTab === "decision-tree" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
							>
								Decision Tree
							</button>
						</div>
						<div className="flex items-center gap-1">
							<Button variant="ghost" size="icon" className="size-7">
								<Play className="size-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-7">
								<Pen className="size-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-7">
								<RefreshCw className="size-3.5" />
							</Button>
						</div>
					</div>
				</div>

				{/* Toolbar: File, Params, Main Model, Abort Model */}
				<div className="flex items-center gap-1 border-b px-4 py-1.5">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
								File
								<ChevronDown className="size-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem>Save</DropdownMenuItem>
							<DropdownMenuItem>Save As...</DropdownMenuItem>
							<DropdownMenuItem>Export</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button variant="ghost" size="sm" className="h-7 text-xs">
						Params
					</Button>
					<button
						type="button"
						onClick={() => setDesignerTab("main")}
						className={`px-2 py-1 text-xs ${designerTab === "main" ? "font-medium text-foreground underline underline-offset-4 decoration-[#0ec0c0] decoration-2" : "text-muted-foreground hover:text-foreground"}`}
					>
						Main Model
					</button>
					<button
						type="button"
						onClick={() => setDesignerTab("abort")}
						className={`px-2 py-1 text-xs ${designerTab === "abort" ? "font-medium text-foreground underline underline-offset-4 decoration-[#0ec0c0] decoration-2" : "text-muted-foreground hover:text-foreground"}`}
					>
						Abort Model
					</button>
				</div>

				{/* Main content: 3-panel layout */}
				<div className="flex flex-1 overflow-hidden">
					{/* Left: Designer Panel */}
					<aside className="w-40 border-r flex flex-col shrink-0">
						<div className="px-3 py-2 border-b">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold">Designer Panel</span>
								<ChevronRight className="size-3 text-[#0ec0c0]" />
							</div>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								Read Only. Full control sho...
							</p>
						</div>
						<div className="px-3 py-2">
							<span className="text-[10px] text-muted-foreground">Navigator</span>
							{/* Minimap */}
							<div className="mt-1 h-44 border-2 border-blue-500 bg-blue-50 rounded-sm relative overflow-hidden">
								{/* Minimap preview boxes */}
								<div className="absolute top-3 left-2 w-16 h-12 border border-blue-300 bg-white rounded-sm" />
								<div className="absolute top-[60px] left-2 w-16 h-14 border border-red-300 bg-white rounded-sm" />
								<div className="absolute top-[130px] left-2 w-16 h-12 border border-red-300 bg-white rounded-sm" />
							</div>
						</div>
					</aside>

					{/* Center: Canvas */}
					<div className="flex-1 flex flex-col bg-slate-50">
						{/* Canvas toolbar */}
						<div className="flex items-center gap-1 px-3 py-1.5 border-b bg-white">
							<Button variant="ghost" size="icon" className="size-7">
								<Printer className="size-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-7">
								<Copy className="size-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-7">
								<Move className="size-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-7">
								<Maximize2 className="size-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-7">
								<Plus className="size-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-7">
								<Minus className="size-3.5" />
							</Button>
						</div>

						{/* SVG Canvas with flow diagram */}
						<div className="flex-1 overflow-auto p-6">
							<svg width="680" height="820" className="mx-auto" style={{ background: "#f1f5f9" }}>
								<defs>
									<marker id="arrow-red" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
										<polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
									</marker>
									<marker id="arrow-green" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
										<polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
									</marker>
									<filter id="shadow" x="-4%" y="-4%" width="108%" height="116%">
										<feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.08" />
									</filter>
								</defs>

								{/* ===== Top-level nodes ===== */}
								<StartNode x={300} y={35} />
								<Arrow x1={300} y1={55} x2={300} y2={75} color="#22c55e" />
								<ActionTaskNode x={300} y={98} label="parse interface name" sublabel="#se.tellabs" selected={selectedTaskId === "parse-interface"} onClick={() => setSelectedTaskId("parse-interface")} />

								{/* Arrow into Group 1 */}
								<Arrow x1={300} y1={122} x2={300} y2={160} color="#22c55e" />

								{/* ===== Group 1 ===== */}
								<rect x={80} y={150} width={480} height={230} rx={3} fill="white" stroke="#cbd5e1" strokeWidth={1} filter="url(#shadow)" />
								{/* Collapse icon */}
								<rect x={88} y={156} width={12} height={12} rx={2} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.5} />
								<text x={94} y={165} textAnchor="middle" fontSize={9} fill="#64748b">−</text>
								{/* Group label */}
								<text x={110} y={166} fontSize={11} fill="#475569">
									Ensure NOKIA_LOOPBACK_IP matches equipment name details
								</text>
								<line x1={80} y1={174} x2={560} y2={174} stroke="#e2e8f0" strokeWidth={1} />

								<TaskNode x={300} y={210} label="get site" sublabel="#se.nokia.5620sam" selected={selectedTaskId === "get-site"} onClick={() => setSelectedTaskId("get-site")} />
								<Arrow x1={300} y1={234} x2={300} y2={266} color="#22c55e" />

								<DecisionNode x={300} y={282} label="Does Name of Loopback IP match Equipment Name?" />

								{/* Decision → left comment (green / yes) */}
								<Arrow x1={284} y1={282} x2={220} y2={320} color="#22c55e" />
								{/* Decision → right comment (red / no) */}
								<Arrow x1={316} y1={282} x2={420} y2={320} color="#ef4444" />

								<CommentNode x={220} y={344} label="comment" sublabel="#resolve" />
								<CommentNode x={420} y={344} label="comment" sublabel="#resolve" />

								{/* Red edge line on right side of group 1 */}
								<GroupRedEdge x={560} y1={150} y2={380} />

								{/* Arrow from group 1 → group 2 */}
								<Arrow x1={300} y1={380} x2={300} y2={420} color="#ef4444" />

								{/* Red line connecting groups on the right edge */}
								<line x1={560} y1={380} x2={560} y2={420} stroke="#ef4444" strokeWidth={2} />

								{/* ===== Group 2 ===== */}
								<rect x={80} y={420} width={480} height={260} rx={3} fill="white" stroke="#cbd5e1" strokeWidth={1} filter="url(#shadow)" />
								<rect x={88} y={426} width={12} height={12} rx={2} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.5} />
								<text x={94} y={435} textAnchor="middle" fontSize={9} fill="#64748b">−</text>
								<text x={110} y={435} fontSize={11} fill="#475569">
									Check if Port is Available, and if other L3 Services already exist
								</text>
								<line x1={80} y1={444} x2={560} y2={444} stroke="#e2e8f0" strokeWidth={1} />

								<TaskNode x={300} y={480} label="get equipment physical port details" sublabel="#se.nokia.5620sam" selected={selectedTaskId === "get-port"} onClick={() => setSelectedTaskId("get-port")} />
								<Arrow x1={300} y1={504} x2={300} y2={536} color="#22c55e" />

								<DecisionNode x={300} y={552} label="Confirm port is spare and available" />

								<Arrow x1={284} y1={552} x2={220} y2={590} color="#22c55e" />
								<Arrow x1={316} y1={552} x2={420} y2={590} color="#ef4444" />

								<CommentNode x={220} y={614} label="comment" sublabel="#resolve" />
								<CommentNode x={420} y={614} label="comment" sublabel="#resolve" />

								{/* Red edge line on right side of group 2 */}
								<GroupRedEdge x={560} y1={420} y2={680} />

								{/* ===== Footer note ===== */}
								<text x={340} y={730} textAnchor="middle" fontSize={9} fill="#94a3b8">
									You have the option of RESOLVE connecting directly to the target device to get the required information,
								</text>
								<text x={340} y={744} textAnchor="middle" fontSize={9} fill="#94a3b8">
									or utilizing the Nokia 5620 SAM to execute the necessary commands remotely (because RESOLVE doesn't have direct network connectivity).
								</text>
							</svg>
						</div>
					</div>

					{/* Right: Properties Panel */}
					<aside className="w-96 border-l flex flex-col shrink-0 bg-white">
						<div className="flex items-center justify-between px-4 py-2 border-b">
							<span className="text-sm font-semibold">Task Properties</span>
							<ChevronRight className="size-3 text-[#0ec0c0]" />
						</div>

						{/* Property fields */}
						<div className="px-4 py-3 space-y-3 border-b">
							<div className="grid grid-cols-[100px_1fr] items-center gap-2">
								<label className="text-xs text-muted-foreground">Display Name:</label>
								<Input value={selectedTask.displayName} readOnly className="h-7 text-xs" />
							</div>
							<div className="grid grid-cols-[100px_1fr] items-center gap-2">
								<label className="text-xs text-muted-foreground">Task Name:</label>
								<div className="flex items-center gap-1">
									<Input value={selectedTask.taskName} readOnly className="h-7 text-xs flex-1" />
									<Button variant="ghost" size="icon" className="size-7 shrink-0">
										<ExternalLink className="size-3" />
									</Button>
									<Button variant="ghost" size="icon" className="size-7 shrink-0">
										<Play className="size-3" />
									</Button>
								</div>
							</div>
							<div className="grid grid-cols-[100px_1fr] items-center gap-2">
								<label className="text-xs text-muted-foreground">Merge:</label>
								<Input value={selectedTask.merge} readOnly className="h-7 text-xs" />
							</div>
						</div>

						{/* Configure / View tabs + Jarvis button */}
						<div className="flex items-center px-4 py-2 border-b">
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => setPropsTab("configure")}
									className={`text-xs ${propsTab === "configure" ? "font-medium text-foreground underline underline-offset-4 decoration-[#0ec0c0] decoration-2" : "text-muted-foreground hover:text-foreground"}`}
								>
									Configure
								</button>
								<button
									type="button"
									onClick={() => setPropsTab("view")}
									className={`text-xs ${propsTab === "view" ? "font-medium text-foreground underline underline-offset-4 decoration-[#0ec0c0] decoration-2" : "text-muted-foreground hover:text-foreground"}`}
								>
									View
								</button>
							</div>
							<div className="ml-auto">
								<button
									type="button"
									onClick={() => setPropsTab(propsTab === "jarvis" ? "configure" : "jarvis")}
									className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
										propsTab === "jarvis"
											? "bg-[#0ec0c0] text-white border-[#0ec0c0]"
											: "bg-white text-muted-foreground border-border hover:border-[#0ec0c0] hover:text-[#0ec0c0]"
									}`}
								>
									Jarvis
								</button>
							</div>
						</div>

						{/* Tab content */}
						{propsTab === "jarvis" ? (
							<div className="flex-1 overflow-hidden">
								<JarvisChat />
							</div>
						) : (
							<>
								{/* Parameters section */}
								<div className="px-4 py-2">
									<span className="text-xs font-medium">Parameters</span>
								</div>

								{/* Input / Output tabs */}
								<div className="flex items-center gap-3 px-4 pb-2">
									<button
										type="button"
										onClick={() => setParamsTab("input")}
										className={`text-xs ${paramsTab === "input" ? "font-medium text-[#0ec0c0]" : "text-muted-foreground hover:text-foreground"}`}
									>
										Input
									</button>
									<button
										type="button"
										onClick={() => setParamsTab("output")}
										className={`text-xs ${paramsTab === "output" ? "font-medium text-[#0ec0c0]" : "text-muted-foreground hover:text-foreground"}`}
									>
										Output
									</button>
								</div>

								{/* Parameters table */}
								<div className="flex-1 overflow-auto px-2">
									<Table>
										<TableHeader>
											<TableRow className="text-[10px]">
												<TableHead className="h-7 text-[10px] w-8" />
												<TableHead className="h-7 text-[10px]">Name</TableHead>
												<TableHead className="h-7 text-[10px]">Source</TableHead>
												<TableHead className="h-7 text-[10px]">Value</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											<TableRow className="bg-muted/30">
												<TableCell className="py-1 text-[10px]">±</TableCell>
												<TableCell colSpan={3} className="py-1 text-[10px] font-medium">Default</TableCell>
											</TableRow>
											{selectedTask.params.map((p) => (
												<TableRow key={p.name}>
													<TableCell className="py-1 text-[10px] text-muted-foreground">›</TableCell>
													<TableCell className="py-1 text-[10px]">{p.name}</TableCell>
													<TableCell className="py-1 text-[10px] text-muted-foreground">{p.source}</TableCell>
													<TableCell className="py-1 text-[10px] font-mono">{p.value}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</>
						)}
					</aside>
				</div>
			</div>
		</ProLayout>
	);
}
