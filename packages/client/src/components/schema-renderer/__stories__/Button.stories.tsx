import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Primitives/Button",
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
				{ type: "button", label: "Click Me", action: "default_action" },
			],
		},
	},
};

export const Destructive: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "button",
					label: "Delete",
					action: "delete_action",
					variant: "destructive",
				},
			],
		},
	},
};

export const Outline: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "button",
					label: "Cancel",
					action: "cancel_action",
					variant: "outline",
				},
			],
		},
	},
};

export const Secondary: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "button",
					label: "Secondary",
					action: "secondary_action",
					variant: "secondary",
				},
			],
		},
	},
};

export const Ghost: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "button",
					label: "Ghost",
					action: "ghost_action",
					variant: "ghost",
				},
			],
		},
	},
};

export const Disabled: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "button",
					label: "Disabled",
					action: "disabled_action",
					disabled: true,
				},
			],
		},
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-row gap-3">
			<SchemaStoryWrapper
				schema={{
					version: "1",
					components: [{ type: "button", label: "Default", action: "default" }],
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					version: "1",
					components: [
						{
							type: "button",
							label: "Destructive",
							action: "destructive",
							variant: "destructive",
						},
					],
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					version: "1",
					components: [
						{
							type: "button",
							label: "Outline",
							action: "outline",
							variant: "outline",
						},
					],
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					version: "1",
					components: [
						{
							type: "button",
							label: "Secondary",
							action: "secondary",
							variant: "secondary",
						},
					],
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					version: "1",
					components: [
						{
							type: "button",
							label: "Ghost",
							action: "ghost",
							variant: "ghost",
						},
					],
				}}
				onAction={fn()}
			/>
		</div>
	),
};
