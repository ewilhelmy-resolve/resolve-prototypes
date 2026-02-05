/**
 * SchemaRenderer Demo Page
 *
 * Standalone demo for testing UI schema rendering without backend.
 * Access at: /demo/schema-renderer
 */

import { useState } from "react";
import { SchemaRenderer } from "../components/schema-renderer";
import { SchemaDebugPanel } from "../components/schema-renderer/SchemaDebugPanel";
import type { UIActionPayload, UISchema } from "../types/uiSchema";

// Example schemas for demo
const EXAMPLE_SCHEMAS: Record<string, UISchema> = {
	simple: {
		version: "1",
		components: [
			{ type: "text", content: "Hello from Platform!", variant: "heading" },
			{
				type: "text",
				content: "This UI was generated from JSON schema.",
				variant: "muted",
			},
			{ type: "button", label: "Click Me", action: "button_clicked" },
		],
	},
	form: {
		version: "1",
		components: [
			{ type: "text", content: "Configure Workflow", variant: "heading" },
			{
				type: "form",
				submitAction: "save_config",
				submitLabel: "Save Configuration",
				children: [
					{
						type: "input",
						name: "workflowName",
						label: "Workflow Name",
						placeholder: "My Automation",
						required: true,
					},
					{
						type: "select",
						name: "trigger",
						label: "Trigger Event",
						options: [
							{ label: "On Ticket Created", value: "ticket_created" },
							{ label: "On SLA Breach", value: "sla_breach" },
							{ label: "On Status Change", value: "status_change" },
						],
					},
					{
						type: "input",
						name: "filter",
						label: "Filter Condition",
						placeholder: "priority = 'high'",
						inputType: "textarea",
					},
				],
			},
		],
	},
	dashboard: {
		version: "1",
		components: [
			{ type: "text", content: "Activity Dashboard", variant: "heading" },
			{
				type: "row",
				gap: 16,
				children: [
					{
						type: "stat",
						label: "Total Tickets",
						value: "1,234",
						change: "+12%",
						changeType: "positive",
					},
					{
						type: "stat",
						label: "Open Issues",
						value: "42",
						change: "-5%",
						changeType: "negative",
					},
					{
						type: "stat",
						label: "Avg Response",
						value: "2.4h",
						changeType: "neutral",
					},
				],
			},
			{
				type: "card",
				title: "Recent Activity",
				description: "Last 24 hours",
				children: [
					{
						type: "table",
						columns: [
							{ key: "ticket", label: "Ticket" },
							{ key: "status", label: "Status" },
							{ key: "priority", label: "Priority" },
						],
						rows: [
							{ ticket: "TKT-001", status: "Open", priority: "High" },
							{ ticket: "TKT-002", status: "Pending", priority: "Medium" },
							{ ticket: "TKT-003", status: "Closed", priority: "Low" },
						],
					},
				],
			},
		],
	},
	card: {
		version: "1",
		components: [
			{
				type: "card",
				title: "Workflow Settings",
				description: "Configure automation behavior",
				children: [
					{
						type: "text",
						content: "Choose how this workflow behaves:",
						variant: "subheading",
					},
					{
						type: "row",
						gap: 8,
						children: [
							{
								type: "button",
								label: "Enable",
								action: "enable_workflow",
								variant: "default",
							},
							{
								type: "button",
								label: "Disable",
								action: "disable_workflow",
								variant: "outline",
							},
							{
								type: "button",
								label: "Delete",
								action: "delete_workflow",
								variant: "destructive",
							},
						],
					},
				],
			},
		],
	},
};

export default function SchemaRendererDemo() {
	const [selectedSchema, setSelectedSchema] = useState<string>("simple");
	const [customSchema, setCustomSchema] = useState<string>("");
	const [useCustom, setUseCustom] = useState(false);
	const [actionHistory, setActionHistory] = useState<UIActionPayload[]>([]);
	const [debugVisible, setDebugVisible] = useState(true);

	const currentSchema = useCustom
		? (JSON.parse(customSchema || "null") as UISchema | null)
		: EXAMPLE_SCHEMAS[selectedSchema];

	const handleAction = (payload: UIActionPayload) => {
		console.log("[Demo] Action received:", payload);
		setActionHistory((prev) => [...prev, payload]);
	};

	const handleSchemaChange = (key: string) => {
		setSelectedSchema(key);
		setUseCustom(false);
	};

	const handleCustomSchemaChange = (value: string) => {
		setCustomSchema(value);
		setUseCustom(true);
	};

	return (
		<div className="min-h-screen bg-gray-50 pb-80">
			{/* Header */}
			<div className="bg-white border-b px-6 py-4">
				<h1 className="text-2xl font-bold">UI Schema Renderer Demo</h1>
				<p className="text-gray-600 text-sm mt-1">
					Platform sends JSON → RITA renders UI → User interacts → Action sent
					back
				</p>
			</div>

			<div className="max-w-6xl mx-auto p-6 grid grid-cols-2 gap-6">
				{/* Left: Schema Input */}
				<div className="space-y-4">
					<div className="bg-white rounded-lg border p-4">
						<h2 className="font-semibold mb-3">1. Platform Sends Schema</h2>

						{/* Preset selector */}
						<div className="flex gap-2 mb-4 flex-wrap">
							{Object.keys(EXAMPLE_SCHEMAS).map((key) => (
								<button
									key={key}
									type="button"
									onClick={() => handleSchemaChange(key)}
									className={`px-3 py-1.5 rounded text-sm ${
										selectedSchema === key && !useCustom
											? "bg-blue-600 text-white"
											: "bg-gray-100 hover:bg-gray-200"
									}`}
								>
									{key}
								</button>
							))}
							<button
								type="button"
								onClick={() => setUseCustom(true)}
								className={`px-3 py-1.5 rounded text-sm ${
									useCustom
										? "bg-blue-600 text-white"
										: "bg-gray-100 hover:bg-gray-200"
								}`}
							>
								custom
							</button>
						</div>

						{/* Schema JSON */}
						<textarea
							className="w-full h-64 font-mono text-xs p-3 border rounded bg-gray-50"
							value={
								useCustom
									? customSchema
									: JSON.stringify(EXAMPLE_SCHEMAS[selectedSchema], null, 2)
							}
							onChange={(e) => handleCustomSchemaChange(e.target.value)}
							placeholder="Paste custom JSON schema here..."
						/>
					</div>
				</div>

				{/* Right: Rendered Output */}
				<div className="space-y-4">
					<div className="bg-white rounded-lg border p-4">
						<h2 className="font-semibold mb-3">2. RITA Renders Components</h2>

						<div className="border rounded-lg p-4 bg-gray-50 min-h-[300px]">
							{currentSchema ? (
								<SchemaRenderer
									schema={currentSchema}
									messageId="demo-message"
									conversationId="demo-conversation"
									onAction={handleAction}
								/>
							) : (
								<div className="text-gray-400 text-center py-8">
									Invalid JSON schema
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Debug Panel */}
			<SchemaDebugPanel
				schema={currentSchema}
				lastAction={actionHistory[actionHistory.length - 1] || null}
				actionHistory={actionHistory}
				isVisible={debugVisible}
				onToggle={() => setDebugVisible((v) => !v)}
			/>
		</div>
	);
}
