/**
 * EmbedDemoPage - Demo page for testing iframe embedding
 *
 * Public page that demonstrates postMessage API and hashkey-based workflow execution.
 * Embeds the /iframe/chat route and provides controls to test communication.
 *
 * Workflow execution flow:
 * 1. Host stores payload in Valkey with a hashkey (simulated here)
 * 2. Host embeds iframe with ?token=xxx&hashkey=yyy
 * 3. RITA backend fetches payload from Valkey and calls postEvent webhook
 * 4. Response flows through queue -> message -> SSE to iframe
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface LogEntry {
	id: number;
	timestamp: string;
	message: string;
	type: "info" | "incoming" | "outgoing" | "error" | "workflow";
}

export default function EmbedDemoPage() {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [iframeReady, setIframeReady] = useState(false);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [requestCounter, setRequestCounter] = useState(0);

	// Form state
	const [token, setToken] = useState("dev-iframe-token-2024");
	const [hashkey, setHashkey] = useState("");
	const [messageContent, setMessageContent] = useState("Hello from host page!");
	const [chatSessionId, setChatSessionId] = useState("workflow-123");
	const [tabInstanceId, setTabInstanceId] = useState("user-456");

	const [currentUrl, setCurrentUrl] = useState("Not loaded yet");
	const [connectionStatus, setConnectionStatus] = useState("Not loaded");
	const [statusType, setStatusType] = useState<"waiting" | "ready" | "error">("waiting");

	const log = useCallback((message: string, type: LogEntry["type"] = "info") => {
		const timestamp = new Date().toLocaleTimeString();
		setLogs((prev) => [
			{ id: Date.now(), timestamp, message, type },
			...prev.slice(0, 99), // Keep last 100 entries
		]);
	}, []);

	const clearLog = useCallback(() => {
		setLogs([]);
	}, []);

	const loadIframe = useCallback(() => {
		if (!token) {
			log("Error: Token is required", "error");
			return;
		}

		const baseUrl = window.location.origin;
		let url = `${baseUrl}/iframe/chat?token=${encodeURIComponent(token)}`;
		if (hashkey) {
			url += `&hashkey=${encodeURIComponent(hashkey)}`;
			log(`Hashkey provided - workflow will execute on iframe load`, "workflow");
		}

		setIframeReady(false);
		setConnectionStatus("Loading...");
		setStatusType("waiting");
		setCurrentUrl(url);

		if (iframeRef.current) {
			iframeRef.current.src = url;
		}

		log(`Loading iframe: ${url}`, "outgoing");
	}, [token, hashkey, log]);

	const sendMessage = useCallback(() => {
		if (!iframeReady) {
			log("Error: Iframe not ready yet", "error");
			return;
		}

		if (!messageContent) {
			log("Error: Message content is required", "error");
			return;
		}

		const reqId = `req_${requestCounter + 1}`;
		setRequestCounter((prev) => prev + 1);

		const message = {
			type: "SEND_MESSAGE",
			payload: {
				content: messageContent,
				...(chatSessionId && { chatSessionId }),
				...(tabInstanceId && { tabInstanceId }),
			},
			requestId: reqId,
		};

		iframeRef.current?.contentWindow?.postMessage(message, "*");
		log(`SEND_MESSAGE [${reqId}]: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}"`, "outgoing");
	}, [iframeReady, messageContent, chatSessionId, tabInstanceId, requestCounter, log]);

	const getStatus = useCallback(() => {
		if (!iframeReady) {
			log("Error: Iframe not ready yet", "error");
			return;
		}

		const reqId = `req_${requestCounter + 1}`;
		setRequestCounter((prev) => prev + 1);

		const message = {
			type: "GET_STATUS",
			requestId: reqId,
		};

		iframeRef.current?.contentWindow?.postMessage(message, "*");
		log(`GET_STATUS [${reqId}]`, "outgoing");
	}, [iframeReady, requestCounter, log]);

	// Listen for messages from iframe
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const { type, requestId, success, error, data } = event.data || {};

			if (!type) return;

			switch (type) {
				case "READY":
					setIframeReady(true);
					setConnectionStatus("Ready");
					setStatusType("ready");
					log("READY: Iframe initialized and ready for commands", "incoming");
					break;

				case "ACK":
					if (success) {
						log(`ACK [${requestId}]: Success`, "incoming");
					} else {
						log(`ACK [${requestId}]: Failed - ${error}`, "error");
					}
					break;

				case "STATUS":
					log(`STATUS [${requestId}]: ${JSON.stringify(data)}`, "incoming");
					break;

				default:
					// Ignore unknown messages (could be from other sources)
					break;
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [log]);

	// Initial log message
	useEffect(() => {
		log('Demo page loaded. Click "Load Iframe" to start.', "info");
	}, [log]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
			<div className="max-w-[1400px] mx-auto">
				{/* Header */}
				<header className="bg-white rounded-xl p-8 mb-5 shadow-lg">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">RITA Iframe Embed Demo</h1>
					<p className="text-gray-600 mb-5">
						Test the iframe-embeddable chat with postMessage API for host page communication.
					</p>

					<div className="flex flex-wrap gap-3 items-center mb-4">
						<label htmlFor="token" className="font-semibold text-gray-900">Token:</label>
						<input
							id="token"
							type="text"
							value={token}
							onChange={(e) => setToken(e.target.value)}
							placeholder="dev-iframe-token-2024"
							className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[250px] focus:outline-none focus:border-indigo-500"
						/>
						<label htmlFor="hashkey" className="font-semibold text-gray-900">Hashkey:</label>
						<input
							id="hashkey"
							type="text"
							value={hashkey}
							onChange={(e) => setHashkey(e.target.value)}
							placeholder="(optional) Valkey key for workflow"
							className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[250px] focus:outline-none focus:border-indigo-500"
						/>
						<button
							onClick={loadIframe}
							className="px-5 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 active:translate-y-px"
						>
							Load Iframe
						</button>
					</div>

					<div className="bg-blue-50 border border-blue-500 rounded-lg p-4">
						<span
							className={`inline-block w-3 h-3 rounded-full mr-2 ${
								statusType === "ready" ? "bg-green-500" : statusType === "error" ? "bg-red-500" : "bg-yellow-500"
							}`}
						/>
						<strong className="text-blue-700">Status:</strong>{" "}
						<span className="text-gray-700">{connectionStatus}</span>
						<br />
						<br />
						<strong className="text-blue-700">Current URL:</strong>{" "}
						<code className="bg-white px-2 py-1 rounded text-pink-600 font-mono text-sm">{currentUrl}</code>
					</div>
				</header>

				{/* Main Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
					{/* Iframe Container */}
					<div className="bg-white rounded-xl p-5 shadow-lg h-[calc(100vh-350px)] min-h-[500px]">
						<iframe
							ref={iframeRef}
							className="w-full h-full border-none rounded-lg bg-white"
							title="RITA Chat Embed"
						/>
					</div>

					{/* Sidebar */}
					<div className="flex flex-col gap-5">
						{/* Message Controls Panel */}
						<div className="bg-white rounded-xl p-5 shadow-lg">
							<h2 className="text-lg font-semibold text-gray-900 mb-3">Send Message (postMessage API)</h2>

							<div className="flex flex-col gap-3">
								<textarea
									value={messageContent}
									onChange={(e) => setMessageContent(e.target.value)}
									placeholder="Type message to send..."
									className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm resize-y min-h-[80px] focus:outline-none focus:border-indigo-500"
								/>

								<div className="flex flex-wrap gap-3 items-center">
									<label htmlFor="chatSessionId" className="font-semibold text-gray-900 text-sm">Chat Session:</label>
									<input
										id="chatSessionId"
										type="text"
										value={chatSessionId}
										onChange={(e) => setChatSessionId(e.target.value)}
										placeholder="workflow-tab-id"
										className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm w-[150px] focus:outline-none focus:border-indigo-500"
									/>
								</div>

								<div className="flex flex-wrap gap-3 items-center">
									<label htmlFor="tabInstanceId" className="font-semibold text-gray-900 text-sm">Tab Instance:</label>
									<input
										id="tabInstanceId"
										type="text"
										value={tabInstanceId}
										onChange={(e) => setTabInstanceId(e.target.value)}
										placeholder="user-connection-id"
										className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm w-[150px] focus:outline-none focus:border-indigo-500"
									/>
								</div>

								<div className="flex gap-3">
									<button
										onClick={sendMessage}
										className="px-5 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 active:translate-y-px"
									>
										Send Message
									</button>
									<button
										onClick={getStatus}
										className="px-5 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 active:translate-y-px"
									>
										Get Status
									</button>
								</div>
							</div>

							{/* Hashkey Workflow Info */}
							<div className="bg-purple-50 border border-purple-500 rounded-lg p-4 mt-4">
								<h3 className="text-sm font-semibold text-purple-700 mb-2">Workflow Execution (via Hashkey)</h3>
								<p className="text-xs text-gray-600 mb-2">
									Workflows are triggered by URL params, not postMessage. The flow is:
								</p>
								<ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
									<li>Host stores payload in Valkey with a hashkey</li>
									<li>Host embeds iframe with <code className="bg-white px-1 rounded">?token=xxx&hashkey=yyy</code></li>
									<li>RITA backend fetches payload from Valkey</li>
									<li>Backend calls postEvent webhook with JWT and params</li>
									<li>Response flows through queue to chat via SSE</li>
								</ol>
								<p className="text-xs text-gray-500 mt-2">
									To test: Store a payload in Valkey, enter the hashkey above, and click Load Iframe.
								</p>
							</div>
						</div>

						{/* Log Panel */}
						<div className="bg-white rounded-xl p-5 shadow-lg flex-1 min-h-[200px] max-h-[400px]">
							<h2 className="text-lg font-semibold text-gray-900 mb-3">Event Log</h2>

							<div className="bg-[#1a1a2e] text-gray-200 p-4 rounded-lg text-xs font-mono overflow-y-auto h-[250px]">
								{logs.map((entry) => (
									<div
										key={entry.id}
										className={`mb-2 pb-2 border-b border-gray-700 ${
											entry.type === "incoming"
												? "text-green-400"
												: entry.type === "outgoing"
													? "text-blue-400"
													: entry.type === "error"
														? "text-red-400"
														: entry.type === "workflow"
															? "text-purple-400"
															: "text-gray-300"
										}`}
									>
										<span className="text-gray-500 text-[10px]">[{entry.timestamp}]</span> {entry.message}
									</div>
								))}
							</div>

							<button
								onClick={clearLog}
								className="mt-3 px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 active:translate-y-px text-sm"
							>
								Clear Log
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
