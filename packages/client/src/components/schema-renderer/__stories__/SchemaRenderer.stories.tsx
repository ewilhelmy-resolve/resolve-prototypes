import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";
import type { UISchema } from "@/types/uiSchema";
import { SchemaRenderer } from "../SchemaRenderer";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Composites/SchemaRenderer",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const InvalidSchema: Story = {
	args: {
		schema: {
			root: "main",
			elements: { main: { type: "unknown_type" } },
		} as unknown as UISchema,
	},
};

export const EmptySchema: Story = {
	args: {
		schema: {
			root: "root",
			elements: { root: { type: "Column", children: [] } },
		},
	},
};

export const Dashboard: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: {
					type: "Column",
					children: ["heading", "stats-row", "divider", "activity-card"],
				},
				heading: {
					type: "Text",
					props: { content: "Activity Dashboard", variant: "heading" },
				},
				"stats-row": {
					type: "Row",
					props: { gap: 16 },
					children: ["stat-tickets", "stat-issues", "stat-response"],
				},
				"stat-tickets": {
					type: "Stat",
					props: {
						label: "Total Tickets",
						value: "1,234",
						change: "+12%",
						changeType: "positive",
					},
				},
				"stat-issues": {
					type: "Stat",
					props: {
						label: "Open Issues",
						value: 42,
						change: "-5%",
						changeType: "negative",
					},
				},
				"stat-response": {
					type: "Stat",
					props: {
						label: "Avg Response",
						value: "2.4h",
						changeType: "neutral",
					},
				},
				divider: { type: "Separator", props: { spacing: "md" } },
				"activity-card": {
					type: "Card",
					props: {
						title: "Recent Activity",
						description: "Last 24 hours",
					},
					children: ["activity-table"],
				},
				"activity-table": {
					type: "Table",
					props: {
						columns: [
							{ key: "ticket", label: "Ticket" },
							{ key: "status", label: "Status" },
							{ key: "priority", label: "Priority" },
						],
						rows: [
							{ ticket: "TKT-001", status: "Open", priority: "High" },
							{
								ticket: "TKT-002",
								status: "Pending",
								priority: "Medium",
							},
						],
					},
				},
			},
		},
	},
};

export const WorkflowForm: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: { type: "Column", children: ["heading", "form"] },
				heading: {
					type: "Text",
					props: { content: "Configure Workflow", variant: "heading" },
				},
				form: {
					type: "Form",
					props: {
						submitAction: "save_config",
						submitLabel: "Save Configuration",
					},
					children: ["workflow-name", "trigger-select", "filter-input"],
				},
				"workflow-name": {
					type: "Input",
					props: {
						name: "workflowName",
						label: "Workflow Name",
						placeholder: "My Automation",
						required: true,
					},
				},
				"trigger-select": {
					type: "Select",
					props: {
						name: "trigger",
						label: "Trigger Event",
						options: [
							{ label: "On Ticket Created", value: "ticket_created" },
							{ label: "On SLA Breach", value: "sla_breach" },
							{ label: "On Status Change", value: "status_change" },
						],
					},
				},
				"filter-input": {
					type: "Input",
					props: {
						name: "filter",
						label: "Filter Condition",
						placeholder: "priority = 'high'",
						inputType: "textarea",
					},
				},
			},
		},
	},
};

function SchemaPlayground() {
	const [json, setJson] = useState(
		JSON.stringify(
			{
				root: "root",
				elements: {
					root: { type: "Column", children: ["heading", "btn"] },
					heading: {
						type: "Text",
						props: {
							content: "Edit JSON to see changes",
							variant: "heading",
						},
					},
					btn: {
						type: "Button",
						props: { label: "Click Me", action: "test" },
					},
				},
			},
			null,
			2,
		),
	);
	const [error, setError] = useState<string>();

	let schema: UISchema | null = null;
	try {
		schema = JSON.parse(json);
		if (error) setError(undefined);
	} catch {
		if (!error) setError("Invalid JSON");
	}

	return (
		<div className="grid grid-cols-2 gap-4 min-h-[400px]">
			<div>
				<label
					htmlFor="schema-json-input"
					className="text-sm font-medium mb-1 block"
				>
					JSON Schema Input
				</label>
				<textarea
					id="schema-json-input"
					className="w-full h-80 font-mono text-xs p-3 border rounded bg-muted/30"
					value={json}
					onChange={(e) => setJson(e.target.value)}
				/>
				{error && <p className="text-sm text-destructive mt-1">{error}</p>}
			</div>
			<div>
				<span className="text-sm font-medium mb-1 block">Rendered Output</span>
				<div className="border rounded p-4 min-h-[320px]">
					{schema && (
						<SchemaRenderer
							schema={schema}
							messageId="playground"
							conversationId="playground"
							onAction={fn()}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

export const Playground: Story = {
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Paste any JSON schema on the left, see rendered output on the right.",
			},
		},
	},
	render: () => <SchemaPlayground />,
};
