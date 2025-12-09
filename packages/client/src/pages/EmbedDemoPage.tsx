/**
 * EmbedDemoPage - Demo page for testing iframe embedding
 *
 * Public page that demonstrates postMessage API and Actions API workflow execution.
 * Embeds the /iframe/chat route and provides controls to test communication.
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
	const [intentEid, setIntentEid] = useState("demo-001");
	const [messageContent, setMessageContent] = useState("Hello from host page!");
	const [chatSessionId, setChatSessionId] = useState("workflow-123");
	const [tabInstanceId, setTabInstanceId] = useState("user-456");
	const [jwtToken, setJwtToken] = useState("");
	const [workflowGuid, setWorkflowGuid] = useState("");
	const [workflowContext, setWorkflowContext] = useState<"Workflow" | "ActivityDesigner">("Workflow");
	const [workflowInput, setWorkflowInput] = useState("Help me with this task");

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
		if (intentEid) {
			url += `&intent-eid=${encodeURIComponent(intentEid)}`;
		}

		setIframeReady(false);
		setConnectionStatus("Loading...");
		setStatusType("waiting");
		setCurrentUrl(url);

		if (iframeRef.current) {
			iframeRef.current.src = url;
		}

		log(`Loading iframe: ${url}`, "outgoing");
	}, [token, intentEid, log]);

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

	const executeWorkflow = useCallback(() => {
		if (!iframeReady) {
			log("Error: Iframe not ready yet", "error");
			return;
		}

		if (!jwtToken) {
			log("Error: JWT token is required for workflow execution", "error");
			return;
		}
		if (!workflowGuid) {
			log("Error: Workflow GUID is required", "error");
			return;
		}
		if (!workflowInput) {
			log("Error: Workflow input message is required", "error");
			return;
		}

		const reqId = `req_${requestCounter + 1}`;
		setRequestCounter((prev) => prev + 1);

		const message = {
			type: "EXECUTE_WORKFLOW",
			payload: {
				jwt: jwtToken.startsWith("Bearer ") ? jwtToken : `Bearer ${jwtToken}`,
				workflowGuid,
				chatInput: workflowInput,
				chatSessionId: chatSessionId || `session-${Date.now()}`,
				tabInstanceId: tabInstanceId || `tab-${Date.now()}`,
				context: workflowContext,
			},
			requestId: reqId,
		};

		iframeRef.current?.contentWindow?.postMessage(message, "*");
		log(
			`EXECUTE_WORKFLOW [${reqId}]: "${workflowInput.substring(0, 40)}${workflowInput.length > 40 ? "..." : ""}" -> ${workflowGuid.substring(0, 8)}...`,
			"workflow"
		);
	}, [iframeReady, jwtToken, workflowGuid, workflowInput, chatSessionId, tabInstanceId, workflowContext, requestCounter, log]);

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
			const { type, requestId, success, error, eventId, data } = event.data || {};

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
						if (eventId) {
							log(`ACK [${requestId}]: Workflow started, eventId=${eventId}`, "workflow");
						} else {
							log(`ACK [${requestId}]: Success`, "incoming");
						}
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
						<label htmlFor="intentEid" className="font-semibold text-gray-900">Intent EID:</label>
						<input
							id="intentEid"
							type="text"
							value={intentEid}
							onChange={(e) => setIntentEid(e.target.value)}
							placeholder="e.g., test-123"
							className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[200px] focus:outline-none focus:border-indigo-500"
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

							{/* Workflow Section */}
							<div className="bg-purple-50 border border-purple-500 rounded-lg p-4 mt-4">
								<h3 className="text-sm font-semibold text-purple-700 mb-3">Execute Workflow (Actions API)</h3>

								<div className="flex flex-col gap-3">
									<div className="flex flex-wrap gap-3 items-center">
										<label htmlFor="jwtToken" className="font-semibold text-gray-900 text-sm">JWT Token:</label>
										<input
											id="jwtToken"
											type="text"
											value={jwtToken}
											onChange={(e) => setJwtToken(e.target.value)}
											placeholder="Bearer eyJ..."
											className="px-3 py-2 border-2 border-gray-200 rounded-lg text-xs w-full focus:outline-none focus:border-purple-500"
										/>
									</div>

									<div className="flex flex-wrap gap-3 items-center">
										<label htmlFor="workflowGuid" className="font-semibold text-gray-900 text-sm">Workflow GUID:</label>
										<input
											id="workflowGuid"
											type="text"
											value={workflowGuid}
											onChange={(e) => setWorkflowGuid(e.target.value)}
											placeholder="uuid-of-system-workflow"
											className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:border-purple-500"
										/>
									</div>

									<div className="flex flex-wrap gap-3 items-center">
										<label htmlFor="workflowContext" className="font-semibold text-gray-900 text-sm">Context:</label>
										<select
											id="workflowContext"
											value={workflowContext}
											onChange={(e) => setWorkflowContext(e.target.value as "Workflow" | "ActivityDesigner")}
											className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-purple-500"
										>
											<option value="Workflow">Workflow</option>
											<option value="ActivityDesigner">ActivityDesigner</option>
										</select>
									</div>

									<textarea
										value={workflowInput}
										onChange={(e) => setWorkflowInput(e.target.value)}
										placeholder="Type message for workflow..."
										className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm resize-y min-h-[60px] focus:outline-none focus:border-purple-500"
									/>

									<button
										onClick={executeWorkflow}
										className="px-5 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 active:translate-y-px"
									>
										Execute Workflow
									</button>
								</div>
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
