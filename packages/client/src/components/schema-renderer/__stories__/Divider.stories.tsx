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
			root: "root",
			elements: {
				root: { type: "Column", children: ["t0", "d0", "t1"] },
				t0: { type: "Text", props: { content: "Content above divider" } },
				d0: { type: "Separator" },
				t1: { type: "Text", props: { content: "Content below divider" } },
			},
		},
	},
};

export const Small: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: { type: "Column", children: ["t0", "d0", "t1"] },
				t0: { type: "Text", props: { content: "Content above" } },
				d0: { type: "Separator", props: { spacing: "sm" } },
				t1: { type: "Text", props: { content: "Content below" } },
			},
		},
	},
};

export const Medium: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: { type: "Column", children: ["t0", "d0", "t1"] },
				t0: { type: "Text", props: { content: "Content above" } },
				d0: { type: "Separator", props: { spacing: "md" } },
				t1: { type: "Text", props: { content: "Content below" } },
			},
		},
	},
};

export const Large: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: { type: "Column", children: ["t0", "d0", "t1"] },
				t0: { type: "Text", props: { content: "Content above" } },
				d0: { type: "Separator", props: { spacing: "lg" } },
				t1: { type: "Text", props: { content: "Content below" } },
			},
		},
	},
};

export const AllSpacings: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<div>
				<SchemaStoryWrapper
					schema={{
						root: "root",
						elements: {
							root: { type: "Column", children: ["t0", "d0", "t1"] },
							t0: {
								type: "Text",
								props: { content: "Small spacing", variant: "subheading" },
							},
							d0: { type: "Separator", props: { spacing: "sm" } },
							t1: {
								type: "Text",
								props: {
									content: "Below small divider",
									variant: "muted",
								},
							},
						},
					}}
					onAction={fn()}
				/>
			</div>
			<div>
				<SchemaStoryWrapper
					schema={{
						root: "root",
						elements: {
							root: { type: "Column", children: ["t0", "d0", "t1"] },
							t0: {
								type: "Text",
								props: {
									content: "Medium spacing (default)",
									variant: "subheading",
								},
							},
							d0: { type: "Separator", props: { spacing: "md" } },
							t1: {
								type: "Text",
								props: {
									content: "Below medium divider",
									variant: "muted",
								},
							},
						},
					}}
					onAction={fn()}
				/>
			</div>
			<div>
				<SchemaStoryWrapper
					schema={{
						root: "root",
						elements: {
							root: { type: "Column", children: ["t0", "d0", "t1"] },
							t0: {
								type: "Text",
								props: { content: "Large spacing", variant: "subheading" },
							},
							d0: { type: "Separator", props: { spacing: "lg" } },
							t1: {
								type: "Text",
								props: {
									content: "Below large divider",
									variant: "muted",
								},
							},
						},
					}}
					onAction={fn()}
				/>
			</div>
		</div>
	),
};
