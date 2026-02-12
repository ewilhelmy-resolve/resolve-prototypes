import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Primitives/Divider",
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
				{ type: "text", content: "Content above divider" },
				{ type: "divider" },
				{ type: "text", content: "Content below divider" },
			],
		},
	},
};

export const Small: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{ type: "text", content: "Content above" },
				{ type: "divider", spacing: "sm" },
				{ type: "text", content: "Content below" },
			],
		},
	},
};

export const Medium: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{ type: "text", content: "Content above" },
				{ type: "divider", spacing: "md" },
				{ type: "text", content: "Content below" },
			],
		},
	},
};

export const Large: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{ type: "text", content: "Content above" },
				{ type: "divider", spacing: "lg" },
				{ type: "text", content: "Content below" },
			],
		},
	},
};

export const AllSpacings: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<div>
				<SchemaStoryWrapper
					schema={{
						version: "1",
						components: [
							{ type: "text", content: "Small spacing", variant: "subheading" },
							{ type: "divider", spacing: "sm" },
							{
								type: "text",
								content: "Below small divider",
								variant: "muted",
							},
						],
					}}
					onAction={fn()}
				/>
			</div>
			<div>
				<SchemaStoryWrapper
					schema={{
						version: "1",
						components: [
							{
								type: "text",
								content: "Medium spacing (default)",
								variant: "subheading",
							},
							{ type: "divider", spacing: "md" },
							{
								type: "text",
								content: "Below medium divider",
								variant: "muted",
							},
						],
					}}
					onAction={fn()}
				/>
			</div>
			<div>
				<SchemaStoryWrapper
					schema={{
						version: "1",
						components: [
							{ type: "text", content: "Large spacing", variant: "subheading" },
							{ type: "divider", spacing: "lg" },
							{
								type: "text",
								content: "Below large divider",
								variant: "muted",
							},
						],
					}}
					onAction={fn()}
				/>
			</div>
		</div>
	),
};
