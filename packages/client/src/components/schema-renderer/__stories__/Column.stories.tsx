import type { Meta, StoryObj } from "@storybook/react";
import type { UISchema } from "@/types/uiSchema";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Layout/Column",
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
					type: "column",
					children: [
						{ type: "text", content: "First row" },
						{ type: "text", content: "Second row" },
						{ type: "text", content: "Third row" },
					],
				},
			],
		} satisfies UISchema,
	},
};

export const CustomGap: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "column",
					gap: 24,
					children: [
						{ type: "text", content: "Spaced item one" },
						{ type: "text", content: "Spaced item two" },
						{ type: "text", content: "Spaced item three" },
					],
				},
			],
		} satisfies UISchema,
	},
};

export const MixedChildren: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "column",
					children: [
						{
							type: "stat",
							label: "Active Users",
							value: 1284,
							change: "+12%",
							changeType: "positive",
						},
						{ type: "divider", spacing: "sm" },
						{
							type: "text",
							content:
								"User activity has been steadily increasing this quarter.",
							variant: "muted",
						},
						{ type: "button", label: "View Details", action: "view-details" },
					],
				},
			],
		} satisfies UISchema,
	},
};
