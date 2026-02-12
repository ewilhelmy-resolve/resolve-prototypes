import type { Meta, StoryObj } from "@storybook/react";
import type { UISchema } from "@/types/uiSchema";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Layout/Row",
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
					type: "row",
					children: [
						{ type: "text", content: "First item" },
						{ type: "text", content: "Second item" },
						{ type: "text", content: "Third item" },
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
					type: "row",
					gap: 32,
					children: [
						{ type: "text", content: "Wide gap left" },
						{ type: "text", content: "Wide gap center" },
						{ type: "text", content: "Wide gap right" },
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
					type: "row",
					children: [
						{
							type: "stat",
							label: "Revenue",
							value: "$12,400",
							change: "+8%",
							changeType: "positive",
						},
						{ type: "button", label: "Refresh", action: "refresh" },
						{
							type: "text",
							content: "Last updated 5 min ago",
							variant: "muted",
						},
					],
				},
			],
		} satisfies UISchema,
	},
};

export const NestedRows: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "row",
					gap: 16,
					children: [
						{
							type: "row",
							gap: 8,
							children: [
								{ type: "text", content: "A1" },
								{ type: "text", content: "A2" },
							],
						},
						{
							type: "row",
							gap: 8,
							children: [
								{ type: "text", content: "B1" },
								{ type: "text", content: "B2" },
								{ type: "text", content: "B3" },
							],
						},
					],
				},
			],
		} satisfies UISchema,
	},
};
