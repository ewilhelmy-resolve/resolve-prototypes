import { useState, useRef, useEffect, useCallback } from "react";
import { Code, Wand2, Send, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import RitaLayout from "@/components/layouts/RitaLayout";
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
	const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowResponse | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [queryInput, setQueryInput] = useState("");

	// Dev panel state
	const [showDevPanel, setShowDevPanel] = useState(false);
	const [jsonInput, setJsonInput] = useState("");
	const [rawEvents, setRawEvents] = useState<Array<{ timestamp: string; [key: string]: unknown }>>([]);

	const messagesEndRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll on message count change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	// Listen for SSE workflow events
	useEffect(() => {
		const handler = (e: Event) => {
			const customEvent = e as CustomEvent<DynamicWorkflowEvent["data"]>;
			const eventData = customEvent.detail;

			// Capture raw event for debugging
			setRawEvents((prev) => [
				...prev,
				{ timestamp: new Date().toISOString(), ...eventData },
			]);

			if (eventData.action === "workflow_created" && eventData.workflow) {
				const workflowResponse: WorkflowResponse = {
					action: "workflow_created",
					workflow: eventData.workflow,
					mappings: eventData.mappings || {},
					visualization: eventData.visualization || "",
				};

				setCurrentWorkflow(workflowResponse);
				const assistantMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: "Workflow generated successfully",
					timestamp: new Date(),
				};
				setMessages((prev) => [...prev, assistantMessage]);
				setIsLoading(false);
			} else if (eventData.action === "progress_update") {
				const progressMessage: ChatMessage = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: eventData.progress || "Processing...",
					timestamp: new Date(),
				};
				setMessages((prev) => [...prev, progressMessage]);
			} else if (eventData.action === "workflow_executed") {
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
		if (!queryInput.trim() || isLoading) return;

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
				query: queryInput,
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
	}, [queryInput, isLoading]);

	// Dev: Render from JSON
	const handleRenderJson = () => {
		if (!jsonInput.trim()) return;
		try {
			const data = JSON.parse(jsonInput);
			if (isWorkflowResponse(data)) {
				setCurrentWorkflow(data);
			}
		} catch {
			// Invalid JSON - ignore
		}
	};

	const handleLoadTestData = () => {
		setJsonInput(JSON.stringify(TEST_WORKFLOW_RESPONSE, null, 2));
	};

	return (
		<RitaLayout>
			<div className="grid grid-cols-1 lg:grid-cols-2 h-full bg-background">
				{/* LEFT COLUMN: Chat */}
				<div className="flex flex-col h-full border-r">
					{/* Dev Panel */}
					<div className="border-b">
						<button
							type="button"
							onClick={() => setShowDevPanel(!showDevPanel)}
							className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 cursor-pointer"
						>
							<span className="flex items-center gap-2">
								<FlaskConical className="w-4 h-4" />
								Dev Tools
							</span>
							{showDevPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
						</button>

						{showDevPanel && (
							<div className="px-4 pb-4">
								<Tabs defaultValue="events" className="w-full">
									<TabsList className="w-full">
										<TabsTrigger value="events" className="flex-1 text-xs cursor-pointer">
											Raw Events {rawEvents.length > 0 && `(${rawEvents.length})`}
										</TabsTrigger>
										<TabsTrigger value="json" className="flex-1 text-xs cursor-pointer">
											Paste JSON
										</TabsTrigger>
									</TabsList>

									<TabsContent value="events" className="mt-2 space-y-2">
										<div className="flex items-center justify-end">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setRawEvents([])}
												className="h-6 text-xs cursor-pointer"
												disabled={rawEvents.length === 0}
											>
												Clear
											</Button>
										</div>
										<pre className="max-h-64 overflow-auto text-xs font-mono bg-muted/50 rounded p-2">
											{rawEvents.length === 0
												? "No events yet. Generate a workflow to see SSE events here."
												: JSON.stringify(rawEvents, null, 2)}
										</pre>
									</TabsContent>

									<TabsContent value="json" className="mt-2 space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-xs text-muted-foreground">Paste workflow JSON</span>
											<Button
												variant="ghost"
												size="sm"
												onClick={handleLoadTestData}
												className="h-6 gap-1 text-xs cursor-pointer"
											>
												<FlaskConical className="w-3 h-3" />
												Load Test Data
											</Button>
										</div>
										<Textarea
											placeholder='{"action": "workflow_created", "workflow": [...], "mappings": {...}}'
											value={jsonInput}
											onChange={(e) => setJsonInput(e.target.value)}
											className="h-24 text-xs font-mono"
										/>
										<Button
											onClick={handleRenderJson}
											disabled={!jsonInput.trim()}
											size="sm"
											className="gap-2 cursor-pointer"
										>
											<Send className="w-4 h-4" />
											Render
										</Button>
									</TabsContent>
								</Tabs>
							</div>
						)}
					</div>

					{/* Chat Messages */}
					<div className="flex-1 overflow-y-auto p-4">
						<div className="space-y-3">
							{messages.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
									<Wand2 className="w-8 h-8 mb-2 opacity-50" />
									<p className="text-sm">Describe what you want to automate</p>
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
												"max-w-[90%] rounded-lg px-3 py-2",
												message.role === "user"
													? "bg-primary text-primary-foreground"
													: message.isError
														? "bg-destructive/10 border border-destructive/20"
														: "bg-muted"
											)}
										>
											<p className={cn(
												"text-sm",
												message.isError && "text-destructive"
											)}>
												{message.content}
											</p>
										</div>
									</div>
								))
							)}
							{isLoading && (
								<div className="flex justify-start">
									<div className="bg-muted rounded-lg px-3 py-2">
										<span className="text-sm text-muted-foreground">Processing...</span>
									</div>
								</div>
							)}
							<div ref={messagesEndRef} />
						</div>
					</div>

					{/* Chat Input */}
					<div className="border-t p-4">
						<div className="flex gap-2">
							<Textarea
								placeholder="Describe the workflow you want to create..."
								value={queryInput}
								onChange={(e) => setQueryInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleGenerateWorkflow();
									}
								}}
								className="min-h-[60px] resize-none"
								disabled={isLoading}
							/>
							<Button
								onClick={handleGenerateWorkflow}
								disabled={!queryInput.trim() || isLoading}
								size="icon"
								className="h-[60px] w-[60px]"
							>
								<Send className="w-5 h-5" />
							</Button>
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: Workflow Visualization */}
				<div className="flex flex-col h-full overflow-hidden">
					<div className="px-4 py-2 border-b bg-muted/30">
						<h2 className="text-sm font-medium text-muted-foreground">Workflow Preview</h2>
					</div>
					<div className="flex-1 overflow-y-auto p-4">
						{currentWorkflow ? (
							<WorkflowRenderer data={currentWorkflow} />
						) : (
							<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
								<Code className="w-8 h-8 mb-2 opacity-50" />
								<p className="text-sm">No workflow loaded</p>
								<p className="text-xs mt-1">Generate or load a workflow to see it here</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</RitaLayout>
	);
}
