import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Complex/Conditional",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const EqualityToggle: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: { type: "Column", children: ["select", "text"] },
				select: {
					type: "Select",
					props: {
						name: "priority",
						label: "Priority",
						placeholder: "Select priority",
						options: [
							{ label: "Low", value: "low" },
							{ label: "Medium", value: "medium" },
							{ label: "High", value: "high" },
						],
					},
				},
				text: {
					type: "Text",
					props: {
						content: "High priority triggers immediate escalation.",
						variant: "muted",
						if: { field: "priority", operator: "eq", value: "high" },
					},
				},
			},
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(canvas.queryByText(/escalation/)).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("combobox"));
		await userEvent.click(canvas.getByText("High"));
		await expect(canvas.getByText(/escalation/)).toBeInTheDocument();
	},
};

export const ExistsOperator: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: { type: "Column", children: ["input", "text"] },
				input: {
					type: "Input",
					props: {
						name: "search",
						label: "Search",
						placeholder: "Type to filter results",
					},
				},
				text: {
					type: "Text",
					props: {
						content: "Showing filtered results.",
						variant: "muted",
						if: { field: "search", operator: "exists" },
					},
				},
			},
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(canvas.queryByText(/filtered results/)).not.toBeInTheDocument();
		const input = canvas.getByPlaceholderText("Type to filter results");
		await userEvent.type(input, "test");
		await expect(canvas.getByText(/filtered results/)).toBeInTheDocument();
	},
};

export const AllOperators: Story = {
	args: {
		schema: {
			root: "root",
			elements: {
				root: {
					type: "Column",
					children: [
						"score-input",
						"name-input",
						"divider",
						"eq-text",
						"neq-text",
						"gt-text",
						"lt-text",
						"exists-text",
						"not-exists-text",
						"contains-text",
					],
				},
				"score-input": {
					type: "Input",
					props: {
						name: "score",
						label: "Score (numeric)",
						placeholder: "Enter a number",
						inputType: "number",
					},
				},
				"name-input": {
					type: "Input",
					props: {
						name: "name",
						label: "Name",
						placeholder: "Enter a name",
					},
				},
				divider: { type: "Separator", props: { spacing: "md" } },
				"eq-text": {
					type: "Text",
					props: {
						content: "EQ: score equals 50",
						if: { field: "score", operator: "eq", value: "50" },
					},
				},
				"neq-text": {
					type: "Text",
					props: {
						content: "NEQ: score is not 50",
						if: { field: "score", operator: "neq", value: "50" },
					},
				},
				"gt-text": {
					type: "Text",
					props: {
						content: "GT: score greater than 75",
						if: { field: "score", operator: "gt", value: 75 },
					},
				},
				"lt-text": {
					type: "Text",
					props: {
						content: "LT: score less than 25",
						if: { field: "score", operator: "lt", value: 25 },
					},
				},
				"exists-text": {
					type: "Text",
					props: {
						content: "EXISTS: name has a value",
						if: { field: "name", operator: "exists" },
					},
				},
				"not-exists-text": {
					type: "Text",
					props: {
						content: "NOT EXISTS: name is empty",
						if: { field: "name", operator: "notExists" },
					},
				},
				"contains-text": {
					type: "Text",
					props: {
						content: "CONTAINS: name contains 'test'",
						if: { field: "name", operator: "contains", value: "test" },
					},
				},
			},
		},
	},
};
