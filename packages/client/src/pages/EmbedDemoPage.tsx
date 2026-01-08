/**
 * EmbedDemoPage - Demo page for testing iframe embedding
 *
 * Public page that demonstrates postMessage API and sessionKey-based workflow execution.
 * Embeds the /iframe/chat route and provides controls to test communication.
 *
 * Workflow execution flow:
 * 1. Host stores payload in Valkey with a sessionKey (guid)
 * 2. Host embeds iframe with ?sessionKey=xxx
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
	const [sessionKey, setSessionKey] = useState("test-local-hashkey-2024");
	const [messageContent, setMessageContent] = useState("Hello from host page!");
	const [chatSessionId, setChatSessionId] = useState("workflow-123");
	const [tabInstanceId, setTabInstanceId] = useState("user-456");

	// Workflow payload state (no JWT - hashkey replaces auth)
	const [workflowEndpoint, setWorkflowEndpoint] = useState("/api/Webhooks/postEvent/YOUR_TENANT_ID");
	const [workflowGuid, setWorkflowGuid] = useState("");
	const [workflowChatInput, setWorkflowChatInput] = useState("Hello from workflow");
	const [workflowContext, setWorkflowContext] = useState<"Workflow" | "ActivityDesigner">("Workflow");
	const [customParams, setCustomParams] = useState("");

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
		if (!sessionKey) {
			log("Error: sessionKey is required", "error");
			return;
		}

		const baseUrl = window.location.origin;
		const url = `${baseUrl}/iframe/chat?sessionKey=${encodeURIComponent(sessionKey)}`;
		log(`SessionKey provided - workflow will execute on iframe load`, "workflow");

		setIframeReady(false);
		setConnectionStatus("Loading...");
		setStatusType("waiting");
		setCurrentUrl(url);

		if (iframeRef.current) {
			iframeRef.current.src = url;
		}

		log(`Loading iframe: ${url}`, "outgoing");
	}, [sessionKey, log]);

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

	// Generate Valkey payload for workflow testing
	// Structure: { endpoint, payload } - no JWT (hashkey replaces auth)
	const generatePayload = useCallback(() => {
		const innerPayload: Record<string, unknown> = {};

		if (workflowGuid) innerPayload.workflowGuid = workflowGuid;
		if (workflowChatInput) innerPayload.chatInput = workflowChatInput;
		if (chatSessionId) innerPayload.chatSessionId = chatSessionId;
		if (tabInstanceId) innerPayload.tabInstanceId = tabInstanceId;
		innerPayload.context = workflowContext;

		// Parse custom params
		if (customParams.trim()) {
			try {
				const custom = JSON.parse(customParams);
				Object.assign(innerPayload, custom);
			} catch {
				// Ignore invalid JSON
			}
		}

		return {
			endpoint: workflowEndpoint,
			payload: innerPayload,
		};
	}, [workflowEndpoint, workflowGuid, workflowChatInput, chatSessionId, tabInstanceId, workflowContext, customParams]);

	const copyRedisCommand = useCallback(() => {
		const payload = generatePayload();
		const key = sessionKey || `workflow-${Date.now()}`;
		// Base64 encode the payload as expected by backend
		const base64Payload = btoa(JSON.stringify(payload));
		const cmd = `redis-cli SET ${key} '${base64Payload}'`;
		navigator.clipboard.writeText(cmd);
		log(`Copied redis-cli command to clipboard (key: ${key}, base64 encoded)`, "workflow");
		if (!sessionKey) {
			setSessionKey(key);
		}
	}, [generatePayload, sessionKey, log]);

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
					<p className="text-gray-600 mb-3">
						Test the iframe-embeddable chat. No JWT needed - sessionKey in Valkey handles auth.
					</p>

					{/* How to Demo */}
					<details className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
						<summary className="font-semibold text-purple-800 cursor-pointer">How to Demo Locally</summary>
						<ol className="text-xs text-purple-900 mt-2 space-y-1 list-decimal list-inside">
							<li><strong>Setup Valkey:</strong> Store payload with sessionKey in Valkey (see Workflow Payload Builder)</li>
							<li><strong>Load iframe:</strong> Click "Load Iframe" - workflow executes automatically</li>
							<li><strong>PostMessage test:</strong> Use "Send Message" after iframe loads</li>
						</ol>
						<div className="mt-2 text-[10px] text-purple-700 font-mono bg-purple-100 p-2 rounded">
							# Start Valkey locally:<br/>
							docker run -d -p 6379:6379 redis:alpine
						</div>
					</details>

					<div className="flex flex-wrap gap-3 items-center mb-4">
						<label htmlFor="sessionKey" className="font-semibold text-gray-900">Session Key:</label>
						<input
							id="sessionKey"
							type="text"
							value={sessionKey}
							onChange={(e) => setSessionKey(e.target.value)}
							placeholder="Valkey session key (guid)"
							className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[350px] focus:outline-none focus:border-indigo-500"
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
					<div className="flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-200px)]">
						{/* Message Controls Panel */}
						<div className="bg-white rounded-xl p-5 shadow-lg">
							<h2 className="text-lg font-semibold text-gray-900 mb-3">Send Message (postMessage API)</h2>

							<div className="flex flex-col gap-3">
								<textarea
									value={messageContent}
									onChange={(e) => setMessageContent(e.target.value)}
									placeholder="Type message to send..."
									className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm resize-y min-h-[60px] focus:outline-none focus:border-indigo-500"
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
						</div>

						{/* Workflow Payload Builder */}
						<div className="bg-white rounded-xl p-5 shadow-lg">
							<h2 className="text-lg font-semibold text-gray-900 mb-2">Workflow Payload Builder</h2>

							{/* Dynamic Endpoint Callout */}
							<div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-3">
								<p className="text-xs font-bold text-green-800 mb-1">RITA will call (dynamic endpoint):</p>
								<code className="text-[11px] text-green-900 bg-green-100 px-2 py-1 rounded block break-all">
									POST $ACTIONS_API_URL{workflowEndpoint}
								</code>
								<p className="text-[10px] text-green-700 mt-2">
									Endpoint from Valkey payload. RITA is a pass-through proxy (no auth added).
								</p>
							</div>

							<p className="text-[10px] text-purple-600 mb-3">
								Payload stored as base64 in Valkey. No JWT - hashkey is the auth.
							</p>

							<div className="flex flex-col gap-2">
								<div>
									<label htmlFor="workflowEndpoint" className="text-xs font-semibold text-gray-700">
										Endpoint (any path - RITA calls this):
									</label>
									<input
										id="workflowEndpoint"
										type="text"
										value={workflowEndpoint}
										onChange={(e) => setWorkflowEndpoint(e.target.value)}
										placeholder="/api/Webhooks/postEvent/{tenantId}"
										className="w-full px-3 py-2 border-2 border-green-300 rounded text-xs font-mono focus:outline-none focus:border-green-500 bg-green-50"
									/>
								</div>

								<div>
									<label htmlFor="workflowGuid" className="text-xs font-semibold text-gray-700">Workflow GUID:</label>
									<input
										id="workflowGuid"
										type="text"
										value={workflowGuid}
										onChange={(e) => setWorkflowGuid(e.target.value)}
										placeholder="uuid-of-system-workflow"
										className="w-full px-3 py-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-purple-500"
									/>
								</div>

								<div>
									<label htmlFor="workflowChatInput" className="text-xs font-semibold text-gray-700">Chat Input:</label>
									<input
										id="workflowChatInput"
										type="text"
										value={workflowChatInput}
										onChange={(e) => setWorkflowChatInput(e.target.value)}
										placeholder="User message"
										className="w-full px-3 py-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-purple-500"
									/>
								</div>

								<div>
									<label htmlFor="workflowContext" className="text-xs font-semibold text-gray-700">Context:</label>
									<select
										id="workflowContext"
										value={workflowContext}
										onChange={(e) => setWorkflowContext(e.target.value as "Workflow" | "ActivityDesigner")}
										className="w-full px-3 py-2 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:border-purple-500"
									>
										<option value="Workflow">Workflow</option>
										<option value="ActivityDesigner">ActivityDesigner</option>
									</select>
								</div>

								<div>
									<label htmlFor="customParams" className="text-xs font-semibold text-gray-700">Custom Params (JSON):</label>
									<textarea
										id="customParams"
										value={customParams}
										onChange={(e) => setCustomParams(e.target.value)}
										placeholder='{"key": "value"}'
										className="w-full px-3 py-2 border border-gray-200 rounded text-xs font-mono min-h-[50px] focus:outline-none focus:border-purple-500"
									/>
								</div>

								<button
									onClick={copyRedisCommand}
									className="px-4 py-2 bg-purple-500 text-white rounded font-semibold text-sm hover:bg-purple-600 active:translate-y-px"
								>
									Copy redis-cli Command
								</button>

								{/* Payload Preview with annotations */}
								<div className="bg-gray-900 p-2 rounded text-[9px] font-mono overflow-x-auto max-h-[120px]">
									<div className="text-gray-500">{"{"}</div>
									<div className="ml-2">
										<span className="text-yellow-400">"endpoint"</span>
										<span className="text-gray-400">: </span>
										<span className="text-green-400">"{workflowEndpoint}"</span>
										<span className="text-gray-500">{" ← RITA POSTs to this"}</span>
									</div>
									<div className="ml-2">
										<span className="text-yellow-400">"payload"</span>
										<span className="text-gray-400">: </span>
										<span className="text-blue-400">{JSON.stringify(generatePayload().payload)}</span>
										<span className="text-gray-500">{" ← request body"}</span>
									</div>
									<div className="text-gray-500">{"}"}</div>
								</div>
							</div>
						</div>

						{/* Log Panel */}
						<div className="bg-white rounded-xl p-5 shadow-lg min-h-[200px]">
							<h2 className="text-lg font-semibold text-gray-900 mb-3">Event Log</h2>

							<div className="bg-[#1a1a2e] text-gray-200 p-4 rounded-lg text-xs font-mono overflow-y-auto h-[150px]">
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
