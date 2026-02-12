import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import type { UISchema } from "@/types/uiSchema";
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
			version: "1",
			components: [
				{
					type: "select",
					name: "priority",
					label: "Priority",
					placeholder: "Select priority",
					options: [
						{ label: "Low", value: "low" },
						{ label: "Medium", value: "medium" },
						{ label: "High", value: "high" },
					],
				},
				{
					type: "text",
					content: "High priority triggers immediate escalation.",
					variant: "muted",
					if: { field: "priority", operator: "eq", value: "high" },
				},
			],
		} satisfies UISchema,
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
			version: "1",
			components: [
				{
					type: "input",
					name: "search",
					label: "Search",
					placeholder: "Type to filter results",
				},
				{
					type: "text",
					content: "Showing filtered results.",
					variant: "muted",
					if: { field: "search", operator: "exists" },
				},
			],
		} satisfies UISchema,
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
			version: "1",
			components: [
				{
					type: "input",
					name: "score",
					label: "Score (numeric)",
					placeholder: "Enter a number",
					inputType: "number",
				},
				{
					type: "input",
					name: "name",
					label: "Name",
					placeholder: "Enter a name",
				},
				{ type: "divider", spacing: "md" },
				{
					type: "text",
					content: "EQ: score equals 50",
					if: { field: "score", operator: "eq", value: "50" },
				},
				{
					type: "text",
					content: "NEQ: score is not 50",
					if: { field: "score", operator: "neq", value: "50" },
				},
				{
					type: "text",
					content: "GT: score greater than 75",
					if: { field: "score", operator: "gt", value: 75 },
				},
				{
					type: "text",
					content: "LT: score less than 25",
					if: { field: "score", operator: "lt", value: 25 },
				},
				{
					type: "text",
					content: "EXISTS: name has a value",
					if: { field: "name", operator: "exists" },
				},
				{
					type: "text",
					content: "NOT EXISTS: name is empty",
					if: { field: "name", operator: "notExists" },
				},
				{
					type: "text",
					content: "CONTAINS: name contains 'test'",
					if: { field: "name", operator: "contains", value: "test" },
				},
			],
		} satisfies UISchema,
	},
};
