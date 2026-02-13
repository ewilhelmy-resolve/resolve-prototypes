import type { Meta, StoryObj } from "@storybook/react";
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
			root: "row",
			elements: {
				row: { type: "Row", children: ["t0", "t1", "t2"] },
				t0: { type: "Text", props: { content: "First item" } },
				t1: { type: "Text", props: { content: "Second item" } },
				t2: { type: "Text", props: { content: "Third item" } },
			},
		},
	},
};

export const CustomGap: Story = {
	args: {
		schema: {
			root: "row",
			elements: {
				row: {
					type: "Row",
					props: { gap: 32 },
					children: ["t0", "t1", "t2"],
				},
				t0: { type: "Text", props: { content: "Wide gap left" } },
				t1: { type: "Text", props: { content: "Wide gap center" } },
				t2: { type: "Text", props: { content: "Wide gap right" } },
			},
		},
	},
};

export const MixedChildren: Story = {
	args: {
		schema: {
			root: "row",
			elements: {
				row: { type: "Row", children: ["stat", "btn", "text"] },
				stat: {
					type: "Stat",
					props: {
						label: "Revenue",
						value: "$12,400",
						change: "+8%",
						changeType: "positive",
					},
				},
				btn: {
					type: "Button",
					props: { label: "Refresh", action: "refresh" },
				},
				text: {
					type: "Text",
					props: {
						content: "Last updated 5 min ago",
						variant: "muted",
					},
				},
			},
		},
	},
};

export const NestedRows: Story = {
	args: {
		schema: {
			root: "outer",
			elements: {
				outer: {
					type: "Row",
					props: { gap: 16 },
					children: ["inner-a", "inner-b"],
				},
				"inner-a": {
					type: "Row",
					props: { gap: 8 },
					children: ["a1", "a2"],
				},
				a1: { type: "Text", props: { content: "A1" } },
				a2: { type: "Text", props: { content: "A2" } },
				"inner-b": {
					type: "Row",
					props: { gap: 8 },
					children: ["b1", "b2", "b3"],
				},
				b1: { type: "Text", props: { content: "B1" } },
				b2: { type: "Text", props: { content: "B2" } },
				b3: { type: "Text", props: { content: "B3" } },
			},
		},
	},
};
