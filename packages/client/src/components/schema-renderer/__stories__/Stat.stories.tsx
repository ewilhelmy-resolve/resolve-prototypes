import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Primitives/Stat",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const Default: Story = {
	args: {
		schema: {
			type: "Stat",
			props: { label: "Total Users", value: "1,234" },
		},
	},
};

export const PositiveChange: Story = {
	args: {
		schema: {
			type: "Stat",
			props: {
				label: "Revenue",
				value: "$52,000",
				change: "+12%",
				changeType: "positive",
			},
		},
	},
};

export const NegativeChange: Story = {
	args: {
		schema: {
			type: "Stat",
			props: {
				label: "Churn Rate",
				value: "3.2%",
				change: "-5%",
				changeType: "negative",
			},
		},
	},
};

export const NeutralChange: Story = {
	args: {
		schema: {
			type: "Stat",
			props: {
				label: "Avg Response Time",
				value: "245ms",
				change: "0%",
				changeType: "neutral",
			},
		},
	},
};

export const NumericValue: Story = {
	args: {
		schema: {
			type: "Stat",
			props: { label: "Open Tickets", value: 87 },
		},
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-row gap-4">
			<SchemaStoryWrapper
				schema={{
					type: "Stat",
					props: {
						label: "Revenue",
						value: "$52,000",
						change: "+12%",
						changeType: "positive",
					},
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					type: "Stat",
					props: {
						label: "Churn Rate",
						value: "3.2%",
						change: "-5%",
						changeType: "negative",
					},
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					type: "Stat",
					props: {
						label: "Latency",
						value: "245ms",
						change: "0%",
						changeType: "neutral",
					},
				}}
				onAction={fn()}
			/>
		</div>
	),
};
