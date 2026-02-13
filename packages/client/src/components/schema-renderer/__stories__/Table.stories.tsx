import type { Meta, StoryObj } from "@storybook/react";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Layout/Table",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const Default: Story = {
	args: {
		schema: {
			type: "Table",
			props: {
				columns: [
					{ key: "name", label: "Name" },
					{ key: "role", label: "Role" },
					{ key: "status", label: "Status" },
				],
				rows: [
					{ name: "Alice", role: "Admin", status: "Active" },
					{ name: "Bob", role: "Editor", status: "Active" },
					{ name: "Carol", role: "Viewer", status: "Inactive" },
				],
			},
		},
	},
};

export const NumericData: Story = {
	args: {
		schema: {
			type: "Table",
			props: {
				columns: [
					{ key: "metric", label: "Metric" },
					{ key: "q1", label: "Q1" },
					{ key: "q2", label: "Q2" },
					{ key: "q3", label: "Q3" },
				],
				rows: [
					{ metric: "Revenue", q1: 45000, q2: 52000, q3: 61000 },
					{ metric: "Expenses", q1: 32000, q2: 34500, q3: 37000 },
					{ metric: "Profit", q1: 13000, q2: 17500, q3: 24000 },
				],
			},
		},
	},
};

export const SingleRow: Story = {
	args: {
		schema: {
			type: "Table",
			props: {
				columns: [
					{ key: "id", label: "ID" },
					{ key: "description", label: "Description" },
					{ key: "priority", label: "Priority" },
				],
				rows: [
					{
						id: "INC-001",
						description: "Server unreachable",
						priority: "High",
					},
				],
			},
		},
	},
};

export const ManyRows: Story = {
	args: {
		schema: {
			type: "Table",
			props: {
				columns: [
					{ key: "id", label: "#" },
					{ key: "task", label: "Task" },
					{ key: "assignee", label: "Assignee" },
					{ key: "status", label: "Status" },
				],
				rows: Array.from({ length: 10 }, (_, i) => ({
					id: i + 1,
					task: `Task ${i + 1}`,
					assignee: ["Alice", "Bob", "Carol", "Dan", "Eve"][i % 5],
					status: ["Open", "In Progress", "Done"][i % 3],
				})),
			},
		},
	},
};

export const ManyColumns: Story = {
	args: {
		schema: {
			type: "Table",
			props: {
				columns: [
					{ key: "id", label: "ID" },
					{ key: "name", label: "Name" },
					{ key: "email", label: "Email" },
					{ key: "department", label: "Department" },
					{ key: "location", label: "Location" },
					{ key: "startDate", label: "Start Date" },
					{ key: "manager", label: "Manager" },
				],
				rows: [
					{
						id: 1,
						name: "Alice Johnson",
						email: "alice@example.com",
						department: "Engineering",
						location: "New York",
						startDate: "2023-01-15",
						manager: "Frank",
					},
					{
						id: 2,
						name: "Bob Smith",
						email: "bob@example.com",
						department: "Marketing",
						location: "London",
						startDate: "2022-06-01",
						manager: "Grace",
					},
					{
						id: 3,
						name: "Carol Lee",
						email: "carol@example.com",
						department: "Sales",
						location: "Tokyo",
						startDate: "2024-03-20",
						manager: "Frank",
					},
				],
			},
		},
	},
};
