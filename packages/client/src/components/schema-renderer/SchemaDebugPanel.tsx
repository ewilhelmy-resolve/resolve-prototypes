/**
 * SchemaDebugPanel
 *
 * Debug panel showing UI schema rendering flow:
 * 1. Schema received from platform (JSON)
 * 2. Rendered output (visual)
 * 3. Action payloads sent back (webhook)
 *
 * Toggle with: ?debug=true or ENABLE_IFRAME_DEV_TOOLS feature flag
 */

import { ChevronDown, ChevronUp, Code, Eye, Send } from "lucide-react";
import { useState } from "react";
import type { UIActionPayload, UISchema } from "../../types/uiSchema";

interface SchemaDebugPanelProps {
	schema: UISchema | null;
	lastAction: UIActionPayload | null;
	actionHistory: UIActionPayload[];
	isVisible: boolean;
	onToggle: () => void;
}

export function SchemaDebugPanel({
	schema,
	lastAction: _lastAction,
	actionHistory,
	isVisible,
	onToggle,
}: SchemaDebugPanelProps) {
	const [activeTab, setActiveTab] = useState<"schema" | "actions">("schema");

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white text-xs font-mono">
			{/* Toggle bar */}
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 hover:bg-slate-700"
			>
				<span className="flex items-center gap-2">
					<Code className="w-4 h-4" />
					UI Schema Debug
					{schema && (
						<span className="px-1.5 py-0.5 bg-green-600 rounded text-[10px]">
							Schema Active
						</span>
					)}
					{actionHistory.length > 0 && (
						<span className="px-1.5 py-0.5 bg-blue-600 rounded text-[10px]">
							{actionHistory.length} actions
						</span>
					)}
				</span>
				{isVisible ? (
					<ChevronDown className="w-4 h-4" />
				) : (
					<ChevronUp className="w-4 h-4" />
				)}
			</button>

			{/* Content */}
			{isVisible && (
				<div className="max-h-80 overflow-hidden flex flex-col">
					{/* Tabs */}
					<div className="flex border-b border-slate-700">
						<button
							type="button"
							onClick={() => setActiveTab("schema")}
							className={`flex items-center gap-1.5 px-4 py-2 ${
								activeTab === "schema"
									? "bg-slate-700 text-white"
									: "text-slate-400 hover:text-white"
							}`}
						>
							<Eye className="w-3.5 h-3.5" />
							Schema Received
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("actions")}
							className={`flex items-center gap-1.5 px-4 py-2 ${
								activeTab === "actions"
									? "bg-slate-700 text-white"
									: "text-slate-400 hover:text-white"
							}`}
						>
							<Send className="w-3.5 h-3.5" />
							Actions Sent
							{actionHistory.length > 0 && (
								<span className="ml-1 px-1.5 py-0.5 bg-blue-600 rounded text-[10px]">
									{actionHistory.length}
								</span>
							)}
						</button>
					</div>

					{/* Tab content */}
					<div className="flex-1 overflow-auto p-4">
						{activeTab === "schema" && (
							<div>
								<div className="text-slate-400 mb-2">
									Platform → RabbitMQ → SSE → Client
								</div>
								{schema ? (
									<pre className="bg-slate-800 p-3 rounded overflow-auto max-h-48">
										{JSON.stringify(schema, null, 2)}
									</pre>
								) : (
									<div className="text-slate-500 italic">
										No UI schema in current messages. Send a message with
										metadata.ui_schema to see it here.
									</div>
								)}
							</div>
						)}

						{activeTab === "actions" && (
							<div>
								<div className="text-slate-400 mb-2">
									User Action → API → Platform Webhook
								</div>
								{actionHistory.length > 0 ? (
									<div className="space-y-2">
										{actionHistory
											.slice()
											.reverse()
											.map((action, i) => (
												<div
													key={`${action.timestamp}-${i}`}
													className="bg-slate-800 p-3 rounded"
												>
													<div className="flex items-center gap-2 mb-1">
														<span className="text-green-400">
															{action.action}
														</span>
														<span className="text-slate-500 text-[10px]">
															{new Date(action.timestamp).toLocaleTimeString()}
														</span>
													</div>
													{action.data && (
														<pre className="text-slate-300 text-[10px] overflow-auto">
															{JSON.stringify(action.data, null, 2)}
														</pre>
													)}
												</div>
											))}
									</div>
								) : (
									<div className="text-slate-500 italic">
										No actions sent yet. Interact with the UI schema components
										to see payloads here.
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Hook to manage debug panel state
 */
export function useSchemaDebug() {
	const [isVisible, setIsVisible] = useState(false);
	const [actionHistory, setActionHistory] = useState<UIActionPayload[]>([]);
	const [lastAction, setLastAction] = useState<UIActionPayload | null>(null);
	const [currentSchema, setCurrentSchema] = useState<UISchema | null>(null);

	const recordAction = (action: UIActionPayload) => {
		setLastAction(action);
		setActionHistory((prev) => [...prev, action]);
	};

	const recordSchema = (schema: UISchema) => {
		setCurrentSchema(schema);
	};

	const toggle = () => setIsVisible((v) => !v);

	return {
		isVisible,
		toggle,
		actionHistory,
		lastAction,
		currentSchema,
		recordAction,
		recordSchema,
	};
}
