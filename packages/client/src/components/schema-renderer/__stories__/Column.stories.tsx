import type { Meta, StoryObj } from "@storybook/react";
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
			root: "col",
			elements: {
				col: { type: "Column", children: ["t0", "t1", "t2"] },
				t0: { type: "Text", props: { content: "First row" } },
				t1: { type: "Text", props: { content: "Second row" } },
				t2: { type: "Text", props: { content: "Third row" } },
			},
		},
	},
};

export const CustomGap: Story = {
	args: {
		schema: {
			root: "col",
			elements: {
				col: {
					type: "Column",
					props: { gap: 24 },
					children: ["t0", "t1", "t2"],
				},
				t0: { type: "Text", props: { content: "Spaced item one" } },
				t1: { type: "Text", props: { content: "Spaced item two" } },
				t2: { type: "Text", props: { content: "Spaced item three" } },
			},
		},
	},
};

export const MixedChildren: Story = {
	args: {
		schema: {
			root: "col",
			elements: {
				col: {
					type: "Column",
					children: ["stat", "divider", "text", "btn"],
				},
				stat: {
					type: "Stat",
					props: {
						label: "Active Users",
						value: 1284,
						change: "+12%",
						changeType: "positive",
					},
				},
				divider: { type: "Separator", props: { spacing: "sm" } },
				text: {
					type: "Text",
					props: {
						content: "User activity has been steadily increasing this quarter.",
						variant: "muted",
					},
				},
				btn: {
					type: "Button",
					props: { label: "View Details", action: "view-details" },
				},
			},
		},
	},
};
