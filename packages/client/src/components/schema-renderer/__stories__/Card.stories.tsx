import type { Meta, StoryObj } from "@storybook/react";
import type { UISchema } from "@/types/uiSchema";
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
			version: "1",
			components: [
				{
					type: "card",
					title: "Overview",
					description: "Summary of current system status",
					children: [
						{
							type: "text",
							content: "All systems are operating normally.",
						},
					],
				},
			],
		} satisfies UISchema,
	},
};

export const WithoutHeader: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "card",
					children: [
						{ type: "text", content: "This card has no title or description." },
						{
							type: "text",
							content: "It only contains child components.",
							variant: "muted",
						},
					],
				},
			],
		} satisfies UISchema,
	},
};

export const WithForm: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "card",
					title: "Create Account",
					description: "Enter your details below",
					children: [
						{
							type: "form",
							submitAction: "create-account",
							submitLabel: "Create",
							children: [
								{
									type: "input",
									name: "fullName",
									label: "Full Name",
									placeholder: "Jane Doe",
									required: true,
								},
								{
									type: "input",
									name: "email",
									label: "Email",
									placeholder: "jane@example.com",
									inputType: "email",
									required: true,
								},
								{
									type: "select",
									name: "role",
									label: "Role",
									placeholder: "Select a role",
									options: [
										{ label: "Admin", value: "admin" },
										{ label: "Editor", value: "editor" },
										{ label: "Viewer", value: "viewer" },
									],
								},
							],
						},
					],
				},
			],
		} satisfies UISchema,
	},
};

export const NestedCards: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "card",
					title: "Parent Card",
					description: "Contains a nested card",
					children: [
						{ type: "text", content: "Content before nested card." },
						{
							type: "card",
							title: "Nested Card",
							children: [
								{
									type: "text",
									content: "This card is nested inside the parent.",
								},
							],
						},
					],
				},
			],
		} satisfies UISchema,
	},
};

export const WithTable: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "card",
					title: "Recent Orders",
					description: "Last 3 orders placed",
					children: [
						{
							type: "table",
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
					],
				},
			],
		} satisfies UISchema,
	},
};
