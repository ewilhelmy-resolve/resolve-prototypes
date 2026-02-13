import type { Meta, StoryObj } from "@storybook/react";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Layout/Card",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const Default: Story = {
	args: {
		schema: {
			root: "card",
			elements: {
				card: {
					type: "Card",
					props: {
						title: "Overview",
						description: "Summary of current system status",
					},
					children: ["text"],
				},
				text: {
					type: "Text",
					props: { content: "All systems are operating normally." },
				},
			},
		},
	},
};

export const WithoutHeader: Story = {
	args: {
		schema: {
			root: "card",
			elements: {
				card: { type: "Card", children: ["t0", "t1"] },
				t0: {
					type: "Text",
					props: { content: "This card has no title or description." },
				},
				t1: {
					type: "Text",
					props: {
						content: "It only contains child components.",
						variant: "muted",
					},
				},
			},
		},
	},
};

export const WithForm: Story = {
	args: {
		schema: {
			root: "card",
			elements: {
				card: {
					type: "Card",
					props: {
						title: "Create Account",
						description: "Enter your details below",
					},
					children: ["form"],
				},
				form: {
					type: "Form",
					props: { submitAction: "create-account", submitLabel: "Create" },
					children: ["name-input", "email-input", "role-select"],
				},
				"name-input": {
					type: "Input",
					props: {
						name: "fullName",
						label: "Full Name",
						placeholder: "Jane Doe",
						required: true,
					},
				},
				"email-input": {
					type: "Input",
					props: {
						name: "email",
						label: "Email",
						placeholder: "jane@example.com",
						inputType: "email",
						required: true,
					},
				},
				"role-select": {
					type: "Select",
					props: {
						name: "role",
						label: "Role",
						placeholder: "Select a role",
						options: [
							{ label: "Admin", value: "admin" },
							{ label: "Editor", value: "editor" },
							{ label: "Viewer", value: "viewer" },
						],
					},
				},
			},
		},
	},
};

export const NestedCards: Story = {
	args: {
		schema: {
			root: "parent",
			elements: {
				parent: {
					type: "Card",
					props: {
						title: "Parent Card",
						description: "Contains a nested card",
					},
					children: ["text", "child"],
				},
				text: {
					type: "Text",
					props: { content: "Content before nested card." },
				},
				child: {
					type: "Card",
					props: { title: "Nested Card" },
					children: ["child-text"],
				},
				"child-text": {
					type: "Text",
					props: { content: "This card is nested inside the parent." },
				},
			},
		},
	},
};

export const WithTable: Story = {
	args: {
		schema: {
			root: "card",
			elements: {
				card: {
					type: "Card",
					props: {
						title: "Recent Orders",
						description: "Last 3 orders placed",
					},
					children: ["table"],
				},
				table: {
					type: "Table",
					props: {
						columns: [
							{ key: "id", label: "Order ID" },
							{ key: "customer", label: "Customer" },
							{ key: "total", label: "Total" },
						],
						rows: [
							{ id: "ORD-001", customer: "Alice", total: "$120.00" },
							{ id: "ORD-002", customer: "Bob", total: "$85.50" },
							{ id: "ORD-003", customer: "Carol", total: "$210.75" },
						],
					},
				},
			},
		},
	},
};
