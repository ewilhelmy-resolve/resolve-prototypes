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
			version: "1",
			components: [{ type: "unknown_type" }],
		} as unknown as UISchema,
	},
};

export const EmptySchema: Story = {
	args: {
		schema: { version: "1", components: [] },
	},
};

export const Dashboard: Story = {
	args: {
		schema: {
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
							value: 42,
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
				{ type: "divider", spacing: "md" },
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
							],
						},
					],
				},
			],
		},
	},
};

export const WorkflowForm: Story = {
	args: {
		schema: {
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
	},
};

function SchemaPlayground() {
	const [json, setJson] = useState(
		JSON.stringify(
			{
				version: "1",
				components: [
					{
						type: "text",
						content: "Edit JSON to see changes",
						variant: "heading",
					},
					{ type: "button", label: "Click Me", action: "test" },
				],
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
