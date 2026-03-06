import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Form Components/Form",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

const defaultFormSchema = {
	root: "form",
	elements: {
		form: {
			type: "Form",
			props: { submitAction: "submit_user" },
			children: ["name-input", "email-input", "role-select"],
		},
		"name-input": {
			type: "Input",
			props: {
				name: "name",
				label: "Name",
				placeholder: "Enter your name",
				required: true,
			},
		},
		"email-input": {
			type: "Input",
			props: {
				name: "email",
				label: "Email",
				inputType: "email",
				placeholder: "user@example.com",
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
};

export const Default: Story = {
	args: {
		schema: defaultFormSchema,
	},
};

export const CustomSubmitLabel: Story = {
	args: {
		schema: {
			root: "form",
			elements: {
				form: {
					type: "Form",
					props: {
						submitAction: "save_config",
						submitLabel: "Save Configuration",
					},
					children: ["host-input", "port-input", "protocol-select"],
				},
				"host-input": {
					type: "Input",
					props: {
						name: "host",
						label: "Host",
						placeholder: "api.example.com",
					},
				},
				"port-input": {
					type: "Input",
					props: {
						name: "port",
						label: "Port",
						inputType: "number",
						placeholder: "8080",
					},
				},
				"protocol-select": {
					type: "Select",
					props: {
						name: "protocol",
						label: "Protocol",
						options: [
							{ label: "HTTPS", value: "https" },
							{ label: "HTTP", value: "http" },
						],
					},
				},
			},
		},
	},
};

export const FormSubmission: Story = {
	args: {
		schema: defaultFormSchema,
		onAction: fn(),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.type(canvas.getByLabelText("Name"), "John");
		await userEvent.click(canvas.getByRole("button", { name: "Submit" }));
		await expect(args.onAction).toHaveBeenCalled();
	},
};
