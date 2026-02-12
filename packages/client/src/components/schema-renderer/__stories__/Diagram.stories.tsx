import type { Meta, StoryObj } from "@storybook/react";
import type { UISchema } from "@/types/uiSchema";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Complex/Diagram",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const Default: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "diagram",
					code: "graph TD;\n  A-->B;\n  B-->C;",
				},
			],
		} satisfies UISchema,
	},
};

export const WithTitle: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "diagram",
					code: "graph TD;\n  A[Client]-->B[API Server];\n  B-->C[Database];\n  B-->D[RabbitMQ];",
					title: "System Architecture",
				},
			],
		} satisfies UISchema,
	},
};

export const SequenceDiagram: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "diagram",
					code: "sequenceDiagram;\n  participant A as Client\n  participant B as Server\n  A->>B: Request\n  B->>A: Response",
				},
			],
		} satisfies UISchema,
	},
};

export const Expandable: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "diagram",
					code: "graph LR;\n  A[Start]-->B{Decision};\n  B-->|Yes|C[Process];\n  B-->|No|D[End];\n  C-->D;",
					title: "Decision Flow",
					expandable: true,
				},
			],
		} satisfies UISchema,
	},
};
