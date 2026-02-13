import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { InlineFormRequest } from "../../ui-form-request/InlineFormRequest";

const meta = {
	component: InlineFormRequest,
	title: "Features/Schema Renderer/Composites/InlineFormRequest",
	tags: ["autodocs"],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof InlineFormRequest>;

export default meta;
type Story = StoryObj<typeof InlineFormRequest>;

const credentialSchema = {
	root: "form",
	elements: {
		form: {
			type: "Form",
			props: {
				title: "Connect ServiceNow",
				description: "Provide credentials to connect",
				submitAction: "save_credentials",
				submitLabel: "Connect",
				cancelLabel: "Skip",
			},
			children: ["i-url", "i-user", "i-pass"],
		},
		"i-url": {
			type: "Input",
			props: {
				name: "instance_url",
				label: "Instance URL",
				placeholder: "https://dev12345.service-now.com",
				required: true,
			},
		},
		"i-user": {
			type: "Input",
			props: { name: "username", label: "Username", required: true },
		},
		"i-pass": {
			type: "Input",
			props: {
				name: "password",
				label: "Password",
				inputType: "password",
				required: true,
			},
		},
	},
};

export const Pending: Story = {
	args: {
		requestId: "req-001",
		uiSchema: credentialSchema,
		status: "pending",
		onSubmit: fn(async () => {}),
		onCancel: fn(async () => {}),
	},
};

export const Completed: Story = {
	args: {
		requestId: "req-002",
		uiSchema: credentialSchema,
		status: "completed",
		formData: {
			instance_url: "https://dev12345.service-now.com",
			username: "admin",
			password: "********",
		},
		submittedAt: "2024-01-15T10:30:00Z",
		onSubmit: fn(async () => {}),
	},
};

export const WithConditionalFields: Story = {
	args: {
		requestId: "req-003",
		uiSchema: {
			root: "form",
			elements: {
				form: {
					type: "Form",
					props: {
						title: "Authentication Setup",
						description: "Choose authentication method",
						submitAction: "save_auth",
						submitLabel: "Save",
					},
					children: [
						"sel-auth",
						"i-user",
						"i-pass",
						"i-client-id",
						"i-client-secret",
					],
				},
				"sel-auth": {
					type: "Select",
					props: {
						name: "auth_type",
						label: "Auth Type",
						options: [
							{ label: "Basic Auth", value: "basic" },
							{ label: "OAuth 2.0", value: "oauth" },
						],
					},
				},
				"i-user": {
					type: "Input",
					props: { name: "username", label: "Username", required: true },
				},
				"i-pass": {
					type: "Input",
					props: {
						name: "password",
						label: "Password",
						inputType: "password",
						required: true,
					},
				},
				"i-client-id": {
					type: "Input",
					props: {
						name: "client_id",
						label: "Client ID",
						required: true,
						if: {
							field: "auth_type",
							operator: "eq",
							value: "oauth",
						},
					},
				},
				"i-client-secret": {
					type: "Input",
					props: {
						name: "client_secret",
						label: "Client Secret",
						inputType: "password",
						required: true,
						if: {
							field: "auth_type",
							operator: "eq",
							value: "oauth",
						},
					},
				},
			},
		},
		status: "pending",
		onSubmit: fn(async () => {}),
		onCancel: fn(async () => {}),
	},
};

export const FormSubmission: Story = {
	args: {
		requestId: "req-004",
		uiSchema: credentialSchema,
		status: "pending",
		onSubmit: fn(async () => {}),
		onCancel: fn(async () => {}),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.type(
			canvas.getByLabelText(/Instance URL/),
			"https://dev12345.service-now.com",
		);
		await userEvent.type(canvas.getByLabelText(/Username/), "admin");
		await userEvent.type(canvas.getByLabelText(/Password/), "secret123");
		await userEvent.click(canvas.getByRole("button", { name: "Connect" }));
		await expect(args.onSubmit).toHaveBeenCalled();
	},
};

export const PlatformUntypedFields: Story = {
	args: {
		requestId: "req-005",
		uiSchema: {
			root: "form",
			elements: {
				form: {
					type: "Form",
					props: {
						title: "Platform Fields Demo",
						description: "Shows how platform sends untyped fields",
						submitAction: "save_fields",
						submitLabel: "Save",
					},
					children: ["f1", "f2", "f3"],
				},
				f1: {
					type: "Text",
					props: { name: "field1", label: "Text-as-Input" },
				},
				f2: {
					type: "Text",
					props: { name: "notes", label: "Notes" },
				},
				f3: {
					type: "Text",
					props: { content: "Static text" },
				},
			},
		},
		status: "pending",
		onSubmit: fn(async () => {}),
	},
};
