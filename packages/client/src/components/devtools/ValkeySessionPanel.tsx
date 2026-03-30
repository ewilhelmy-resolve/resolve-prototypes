import { Database, RefreshCw, X } from "lucide-react";
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
						{tab === "live" && (
							<Button
								size="icon"
								variant="ghost"
								className="h-7 w-7"
								onClick={fetchSession}
								disabled={loading}
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
								/>
							</Button>
						)}
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7"
							onClick={onClose}
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
				{initialPayload && (
					<div className="flex border-b px-4">
						<button
							className={`px-3 py-2 text-xs font-medium border-b-2 ${tab === "init" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
							onClick={() => setTab("init")}
						>
							On Init
						</button>
						<button
							className={`px-3 py-2 text-xs font-medium border-b-2 ${tab === "live" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
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
						<pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
							{JSON.stringify(activeData, null, 2)}
						</pre>
					) : loading ? (
						<div className="text-sm text-muted-foreground">Loading...</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
