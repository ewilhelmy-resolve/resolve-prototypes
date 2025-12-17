import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Settings, ChevronDown, ChevronUp, FlaskConical, Code, Globe, FileJson, Upload, Download, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import RitaLayout from "@/components/layouts/RitaLayout";
import { useProfile } from "@/hooks/api/useProfile";
import { workflowApi } from "@/services/workflowApi";
import type { DynamicWorkflowEvent } from "@/services/EventSourceSSEClient";
import {
	type WorkflowResponse,
	type WorkflowTask,
	type ChatMessage,
	isWorkflowResponse,
	parseInputKeys,
	parseOutputKeys,
} from "./workflows/types";
import { TEST_WORKFLOW_RESPONSE } from "./workflows/testWorkflowData";

type InputSource = "json" | "url";

// Workflow Step Card Component
function WorkflowStepCard({
	task,
	stepNumber,
}: {
	task: WorkflowTask;
	stepNumber: number;
}) {
	const [showCode, setShowCode] = useState(false);
	const inputKeys = parseInputKeys(task.snippet.input_example);
	const outputKeys = parseOutputKeys(task.snippet.output_keys);

	const actionLabel = task.action.toUpperCase();
	const actionColor =
		task.action === "reuse"
			? "bg-gray-100 text-gray-600"
			: task.action === "create"
				? "bg-green-100 text-green-600"
				: "bg-yellow-100 text-yellow-600";

	return (
		<div className="border rounded-lg bg-white shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
				<span className="text-blue-600 font-semibold">Step {stepNumber}</span>
				<span className={cn("text-xs font-medium px-2 py-1 rounded", actionColor)}>
					{actionLabel}
				</span>
			</div>

			{/* Content */}
			<div className="px-4 py-3 space-y-2">
				<p className="text-sm text-foreground">{task.description}</p>

				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
					{inputKeys.length > 0 && (
						<div className="flex items-center gap-1">
							<span>Reads:</span>
							{inputKeys.map((key) => (
								<code key={key} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
									{key}
								</code>
							))}
						</div>
					)}
					{outputKeys.length > 0 && (
						<div className="flex items-center gap-1">
							<span>Writes:</span>
							{outputKeys.map((key) => (
								<code key={key} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
									{key}
								</code>
							))}
						</div>
					)}
				</div>

				{/* Code toggle */}
				<button
					type="button"
					onClick={() => setShowCode(!showCode)}
					className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
				>
					<Code className="w-3 h-3" />
					{showCode ? "Hide code" : "Show code"}
				</button>

				{showCode && (
					<pre className="mt-2 p-3 bg-gray-900 text-gray-100 text-xs rounded overflow-x-auto">
						<code>{task.snippet.code}</code>
					</pre>
				)}
			</div>
		</div>
	);
}

// Key Mapping Connector Component
function KeyMappingConnector({ mappings }: { mappings: Record<string, string> }) {
	const entries = Object.entries(mappings);
	if (entries.length === 0) return null;

	return (
		<div className="flex flex-col items-center py-2">
			<div className="text-gray-400 text-lg">↓</div>
			<div className="border border-yellow-300 bg-yellow-50 rounded px-4 py-2 my-1">
				<div className="text-[10px] text-gray-500 uppercase tracking-wide text-center mb-1">
					Key Mapping
				</div>
				{entries.map(([from, to]) => (
					<div key={from} className="text-xs text-gray-700 text-center">
						<code className="text-yellow-700">{from}</code>
						<span className="mx-2">→</span>
						<code className="text-yellow-700">{to}</code>
					</div>
				))}
			</div>
			<div className="text-gray-400 text-lg">↓</div>
		</div>
	);
}

// Workflow Renderer Component
function WorkflowRenderer({ data }: { data: WorkflowResponse }) {
	return (
		<div className="space-y-1">
			{data.workflow.map((task, index) => {
				const stepNumber = index + 1;
				const nextStepNumber = stepNumber + 1;
				const mapping = data.mappings[String(nextStepNumber)];

				return (
					<div key={task.task_id}>
						<WorkflowStepCard task={task} stepNumber={stepNumber} />
						{mapping && index < data.workflow.length - 1 && (
							<KeyMappingConnector mappings={mapping} />
						)}
					</div>
				);
			})}
		</div>
	);
}

export default function WorkflowsPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [showConfig, setShowConfig] = useState(true);
	const [activeTab, setActiveTab] = useState<"generate" | "input" | "output">("generate");
	const [isLoading, setIsLoading] = useState(false);

	// Generate tab state
	const [queryInput, setQueryInput] = useState("");

	// Input tab state
	const [inputSource, setInputSource] = useState<InputSource>("json");
	const [jsonInput, setJsonInput] = useState("");
	const [inputEndpoint, setInputEndpoint] = useState("");

	// Output tab state
	const [outputEndpoint, setOutputEndpoint] = useState("");
	const [outputPayload, setOutputPayload] = useState("");

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { data: profile } = useProfile();

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll on message count change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	// Listen for SSE workflow events
	useEffect(() => {
		const handler = (e: Event) => {
			const customEvent = e as CustomEvent<DynamicWorkflowEvent["data"]>;
			const eventData = customEvent.detail;

			if (eventData.action === "workflow_created" && eventData.workflow) {
				const workflowResponse: WorkflowResponse = {
					action: "workflow_created",
					workflow: eventData.workflow,
					mappings: eventData.mappings || {},
					visualization: eventData.visualization || "",
				};

				const assistantMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: JSON.stringify(workflowResponse, null, 2),
					timestamp: new Date(),
					workflowData: workflowResponse,
				};
				setMessages((prev) => [...prev, assistantMessage]);
				setIsLoading(false);
			} else if (eventData.action === "progress_update") {
				// Handle progress updates (optional: could show in UI)
				console.log("[Workflow] Progress:", eventData.progress);
			} else if (eventData.action === "workflow_executed") {
				// Handle execution results
				const resultMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: eventData.result
						? JSON.stringify(eventData.result, null, 2)
						: eventData.error || "Workflow executed",
					timestamp: new Date(),
					isError: !!eventData.error,
				};
				setMessages((prev) => [...prev, resultMessage]);
				setIsLoading(false);
			}
		};

		window.addEventListener("workflow:event", handler);
		return () => window.removeEventListener("workflow:event", handler);
	}, []);

	// Generate workflow via webhook
	const handleGenerateWorkflow = useCallback(async () => {
		if (!queryInput.trim() || !profile || isLoading) return;

		setIsLoading(true);
		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: queryInput,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMessage]);

		try {
			await workflowApi.generateWorkflow({
				action: "generate_dynamic_workflow",
				tenant_id: profile.organization.id,
				user_email: profile.user.email,
				user_id: profile.user.id,
				query: queryInput,
				index_name: "qasa_snippets3",
			});
			setQueryInput("");
			// Response will come via SSE
		} catch (error) {
			const errorMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: `Error: ${error instanceof Error ? error.message : "Failed to generate workflow"}`,
				timestamp: new Date(),
				isError: true,
			};
			setMessages((prev) => [...prev, errorMessage]);
			setIsLoading(false);
		}
	}, [queryInput, profile, isLoading]);

	// INPUT: Render from JSON
	const handleRenderJson = () => {
		if (!jsonInput.trim()) return;

		try {
			const data = JSON.parse(jsonInput);

			const userMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "user",
				content: "[JSON Input]",
				timestamp: new Date(),
			};

			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: jsonInput,
				timestamp: new Date(),
				workflowData: isWorkflowResponse(data) ? data : undefined,
				isError: !isWorkflowResponse(data),
			};

			setMessages((prev) => [...prev, userMessage, assistantMessage]);

			if (!isWorkflowResponse(data)) {
				const warningMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: "Warning: JSON is not a valid workflow response. Showing raw JSON.",
					timestamp: new Date(),
					isError: true,
				};
				setMessages((prev) => [...prev, warningMessage]);
			}
		} catch (error) {
			const errorMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: `JSON Parse Error: ${error instanceof Error ? error.message : "Invalid JSON"}`,
				timestamp: new Date(),
				isError: true,
			};
			setMessages((prev) => [...prev, errorMessage]);
		}
	};

	// INPUT: Fetch from URL
	const handleFetchFromUrl = async () => {
		if (!inputEndpoint.trim() || isLoading) return;

		setIsLoading(true);
		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: `[Fetch] ${inputEndpoint}`,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMessage]);

		try {
			const response = await fetch(inputEndpoint, {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});

			const data = await response.json();

			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: JSON.stringify(data, null, 2),
				timestamp: new Date(),
				isError: !response.ok,
				workflowData: isWorkflowResponse(data) ? data : undefined,
			};
			setMessages((prev) => [...prev, assistantMessage]);
		} catch (error) {
			const errorMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: `Fetch Error: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
				isError: true,
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	// OUTPUT: Send to endpoint
	const handleSendToEndpoint = async () => {
		if (!outputEndpoint.trim() || !outputPayload.trim() || isLoading) return;

		setIsLoading(true);
		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: `[Send] ${outputEndpoint}`,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMessage]);

		try {
			const payload = JSON.parse(outputPayload);

			const response = await fetch(outputEndpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: JSON.stringify(data, null, 2),
				timestamp: new Date(),
				isError: !response.ok,
				workflowData: isWorkflowResponse(data) ? data : undefined,
			};
			setMessages((prev) => [...prev, assistantMessage]);
		} catch (error) {
			const errorMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
				isError: true,
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLoadTestData = () => {
		setJsonInput(JSON.stringify(TEST_WORKFLOW_RESPONSE, null, 2));
	};

	return (
		<RitaLayout>
			<div className="flex flex-col h-full bg-background">
				{/* Config Panel */}
				<div className="border-b">
					<button
						type="button"
						onClick={() => setShowConfig(!showConfig)}
						className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
					>
						<span className="flex items-center gap-2">
							<Settings className="w-4 h-4" />
							Configuration
						</span>
						{showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
					</button>

					{showConfig && (
						<div className="px-4 pb-4">
							<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "generate" | "input" | "output")}>
								<TabsList className="mb-3">
									<TabsTrigger value="generate" className="gap-2">
										<Wand2 className="w-4 h-4" />
										Generate
									</TabsTrigger>
									<TabsTrigger value="input" className="gap-2">
										<Download className="w-4 h-4" />
										Input
									</TabsTrigger>
									<TabsTrigger value="output" className="gap-2">
										<Upload className="w-4 h-4" />
										Output
									</TabsTrigger>
								</TabsList>

								{/* GENERATE TAB */}
								<TabsContent value="generate" className="space-y-3 mt-0">
									<div className="space-y-2">
										<Label htmlFor="queryInput" className="text-xs">Describe the workflow you want to create</Label>
										<Textarea
											id="queryInput"
											placeholder="e.g., Create a workflow that takes a ServiceNow ticket and summarizes it..."
											value={queryInput}
											onChange={(e) => setQueryInput(e.target.value)}
											className="h-24 text-sm"
										/>
									</div>
									<Button
										onClick={handleGenerateWorkflow}
										disabled={!queryInput.trim() || !profile || isLoading}
										size="sm"
										className="gap-2"
									>
										<Wand2 className="w-4 h-4" />
										{isLoading ? "Generating..." : "Generate Workflow"}
									</Button>
									{!profile && (
										<p className="text-xs text-muted-foreground">Loading profile...</p>
									)}
								</TabsContent>

								{/* INPUT TAB */}
								<TabsContent value="input" className="space-y-3 mt-0">
									{/* Source toggle */}
									<div className="flex gap-2">
										<Button
											variant={inputSource === "json" ? "default" : "outline"}
											size="sm"
											onClick={() => setInputSource("json")}
											className="gap-2"
										>
											<FileJson className="w-4 h-4" />
											Paste JSON
										</Button>
										<Button
											variant={inputSource === "url" ? "default" : "outline"}
											size="sm"
											onClick={() => setInputSource("url")}
											className="gap-2"
										>
											<Globe className="w-4 h-4" />
											Fetch URL
										</Button>
									</div>

									{inputSource === "json" ? (
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<Label htmlFor="jsonInput" className="text-xs">Workflow JSON</Label>
												<Button
													variant="ghost"
													size="sm"
													onClick={handleLoadTestData}
													className="h-6 gap-1 text-xs"
												>
													<FlaskConical className="w-3 h-3" />
													Load Test Data
												</Button>
											</div>
											<Textarea
												id="jsonInput"
												placeholder='{"action": "workflow_created", "workflow": [...], "mappings": {...}}'
												value={jsonInput}
												onChange={(e) => setJsonInput(e.target.value)}
												className="h-32 text-xs font-mono"
											/>
											<Button
												onClick={handleRenderJson}
												disabled={!jsonInput.trim()}
												size="sm"
												className="gap-2"
											>
												<Send className="w-4 h-4" />
												Render
											</Button>
										</div>
									) : (
										<div className="space-y-2">
											<Label htmlFor="inputEndpoint" className="text-xs">Endpoint URL (GET)</Label>
											<div className="flex gap-2">
												<Input
													id="inputEndpoint"
													type="url"
													placeholder="https://api.example.com/workflow"
													value={inputEndpoint}
													onChange={(e) => setInputEndpoint(e.target.value)}
													className="h-8 text-sm flex-1"
												/>
												<Button
													onClick={handleFetchFromUrl}
													disabled={!inputEndpoint.trim() || isLoading}
													size="sm"
													className="gap-2"
												>
													<Download className="w-4 h-4" />
													Fetch
												</Button>
											</div>
										</div>
									)}
								</TabsContent>

								{/* OUTPUT TAB */}
								<TabsContent value="output" className="space-y-3 mt-0">
									<div className="space-y-2">
										<Label htmlFor="outputEndpoint" className="text-xs">Endpoint URL (POST)</Label>
										<Input
											id="outputEndpoint"
											type="url"
											placeholder="https://api.example.com/submit"
											value={outputEndpoint}
											onChange={(e) => setOutputEndpoint(e.target.value)}
											className="h-8 text-sm"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="outputPayload" className="text-xs">JSON Payload</Label>
										<Textarea
											id="outputPayload"
											placeholder='{"workflow_id": "...", "data": {...}}'
											value={outputPayload}
											onChange={(e) => setOutputPayload(e.target.value)}
											className="h-32 text-xs font-mono"
										/>
									</div>
									<Button
										onClick={handleSendToEndpoint}
										disabled={!outputEndpoint.trim() || !outputPayload.trim() || isLoading}
										size="sm"
										className="gap-2"
									>
										<Send className="w-4 h-4" />
										Send
									</Button>
								</TabsContent>
							</Tabs>
						</div>
					)}
				</div>

				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto p-4">
					<div className="max-w-3xl mx-auto space-y-4">
						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
								<p className="text-lg font-medium">Workflow Generator</p>
								<p className="text-sm">
									{activeTab === "generate"
										? "Describe what you want to automate and generate a workflow"
										: activeTab === "input"
											? "Use Input tab to load workflow data (JSON or fetch from URL)"
											: "Use Output tab to send data to an endpoint"
									}
								</p>
							</div>
						) : (
							messages.map((message) => (
								<div
									key={message.id}
									className={cn(
										"flex",
										message.role === "user" ? "justify-end" : "justify-start"
									)}
								>
									<div
										className={cn(
											"max-w-[85%] rounded-lg",
											message.role === "user"
												? "bg-primary text-primary-foreground px-4 py-2"
												: message.isError
													? "bg-destructive/10 border border-destructive/20 px-4 py-2"
													: message.workflowData
														? "bg-transparent w-full"
														: "bg-muted px-4 py-2"
										)}
									>
										{message.role === "assistant" ? (
											message.workflowData ? (
												<WorkflowRenderer data={message.workflowData} />
											) : (
												<pre className={cn(
													"text-sm whitespace-pre-wrap break-words font-mono",
													message.isError && "text-destructive"
												)}>
													{message.content}
												</pre>
											)
										) : (
											<p className="text-sm">{message.content}</p>
										)}
									</div>
								</div>
							))
						)}
						{isLoading && (
							<div className="flex justify-start">
								<div className="bg-muted rounded-lg px-4 py-2">
									<span className="text-sm text-muted-foreground">Loading...</span>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>
				</div>
			</div>
		</RitaLayout>
	);
}
