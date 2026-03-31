import { Check, ClipboardCopy, Database, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ValkeySessionPanelProps {
	sessionKey: string;
	apiUrl: string;
	initialPayload?: Record<string, unknown> | null;
	onClose: () => void;
}

export function ValkeySessionPanel({
	sessionKey,
	apiUrl,
	initialPayload,
	onClose,
}: ValkeySessionPanelProps) {
	const [liveData, setLiveData] = useState<Record<string, unknown> | null>(
		null,
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<"init" | "live">(
		initialPayload ? "init" : "live",
	);
	const [copied, setCopied] = useState<string | null>(null);

	const fetchSession = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`${apiUrl}/api/iframe/debug?sessionKey=${encodeURIComponent(sessionKey)}`,
				{ credentials: "include" },
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			setLiveData(json);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [sessionKey, apiUrl]);

	useEffect(() => {
		if (tab === "live" && !liveData) {
			fetchSession();
		}
	}, [tab, liveData, fetchSession]);

	const activeData = tab === "init" ? initialPayload : liveData;

	const copyToClipboard = useCallback((label: string, value: unknown) => {
		const text =
			typeof value === "string" ? value : JSON.stringify(value, null, 2);
		navigator.clipboard.writeText(text);
		setCopied(label);
		setTimeout(() => setCopied(null), 1500);
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-background border rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<div className="flex items-center gap-2">
						<Database className="h-4 w-4 text-muted-foreground" />
						<span className="font-semibold text-sm">Valkey Session</span>
						<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
							rita:session:{sessionKey.substring(0, 8)}...
						</code>
					</div>
					<div className="flex items-center gap-1">
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7 cursor-pointer"
							onClick={() => copyToClipboard("all", activeData)}
							title="Copy JSON"
						>
							{copied === "all" ? (
								<Check className="h-3.5 w-3.5 text-green-500" />
							) : (
								<ClipboardCopy className="h-3.5 w-3.5" />
							)}
						</Button>
						{tab === "live" && (
							<Button
								size="icon"
								variant="ghost"
								className="h-7 w-7 cursor-pointer"
								onClick={fetchSession}
								disabled={loading}
								title="Refresh"
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
								/>
							</Button>
						)}
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7 cursor-pointer"
							onClick={onClose}
							title="Close"
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
				{initialPayload && (
					<div className="flex border-b px-4">
						<button
							type="button"
							className={`px-3 py-2 text-xs font-medium border-b-2 cursor-pointer ${tab === "init" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
							onClick={() => setTab("init")}
						>
							On Init
						</button>
						<button
							type="button"
							className={`px-3 py-2 text-xs font-medium border-b-2 cursor-pointer ${tab === "live" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
							onClick={() => setTab("live")}
						>
							Live (Valkey)
						</button>
					</div>
				)}
				<div className="overflow-auto flex-1 p-4">
					{error && tab === "live" && (
						<div className="text-sm text-destructive mb-3">Error: {error}</div>
					)}
					{activeData ? (
						<JsonTree
							data={activeData}
							onCopy={copyToClipboard}
							copiedKey={copied}
						/>
					) : loading ? (
						<div className="text-sm text-muted-foreground">Loading...</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function JsonTree({
	data,
	onCopy,
	copiedKey,
	depth = 0,
}: {
	data: unknown;
	onCopy: (label: string, value: unknown) => void;
	copiedKey: string | null;
	depth?: number;
}) {
	if (data === null || data === undefined) {
		return <span className="text-muted-foreground">null</span>;
	}

	if (typeof data !== "object") {
		return (
			<span className="text-xs font-mono">
				{typeof data === "string" ? `"${data}"` : String(data)}
			</span>
		);
	}

	const entries = Array.isArray(data)
		? data.map((v, i) => [String(i), v] as const)
		: (Object.entries(data) as [string, unknown][]);

	return (
		<div className={depth > 0 ? "ml-4" : ""}>
			{entries.map(([key, value]) => {
				const isObject = value !== null && typeof value === "object";
				const copyKey = `${depth}-${key}`;
				const valueStr =
					typeof value === "string" ? value : JSON.stringify(value, null, 2);
				const isLong = typeof valueStr === "string" && valueStr.length > 80;

				return (
					<div key={key} className="group py-0.5">
						<div className="flex items-start gap-1">
							<span className="text-xs font-mono text-primary font-semibold shrink-0">
								{key}:
							</span>
							{isObject ? (
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1">
										<span className="text-xs text-muted-foreground">
											{Array.isArray(value)
												? `[${(value as unknown[]).length}]`
												: `{${Object.keys(value as object).length}}`}
										</span>
										<button
											type="button"
											className="opacity-0 group-hover:opacity-100 cursor-pointer p-0.5 rounded hover:bg-muted"
											onClick={() => onCopy(copyKey, value)}
											title="Copy value"
										>
											{copiedKey === copyKey ? (
												<Check className="h-3 w-3 text-green-500" />
											) : (
												<ClipboardCopy className="h-3 w-3 text-muted-foreground" />
											)}
										</button>
									</div>
									<JsonTree
										data={value}
										onCopy={onCopy}
										copiedKey={copiedKey}
										depth={depth + 1}
									/>
								</div>
							) : (
								<div className="flex items-start gap-1 flex-1 min-w-0">
									<span
										className={`text-xs font-mono break-all ${
											typeof value === "string"
												? "text-green-600 dark:text-green-400"
												: "text-blue-600 dark:text-blue-400"
										} ${isLong ? "line-clamp-2" : ""}`}
										title={isLong ? String(value) : undefined}
									>
										{typeof value === "string" ? `"${value}"` : String(value)}
									</span>
									<button
										type="button"
										className="opacity-0 group-hover:opacity-100 cursor-pointer p-0.5 rounded hover:bg-muted shrink-0"
										onClick={() => onCopy(copyKey, value)}
										title="Copy value"
									>
										{copiedKey === copyKey ? (
											<Check className="h-3 w-3 text-green-500" />
										) : (
											<ClipboardCopy className="h-3 w-3 text-muted-foreground" />
										)}
									</button>
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
