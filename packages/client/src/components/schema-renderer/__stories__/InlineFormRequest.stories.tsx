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
	version: "1" as const,
	modals: {
		"cred-form": {
			title: "Connect ServiceNow",
			description: "Provide credentials to connect",
			submitAction: "save_credentials",
			submitLabel: "Connect",
			cancelLabel: "Skip",
			children: [
				{
					type: "input" as const,
					name: "instance_url",
					label: "Instance URL",
					placeholder: "https://dev12345.service-now.com",
					required: true,
				},
				{
					type: "input" as const,
					name: "username",
					label: "Username",
					required: true,
				},
				{
					type: "input" as const,
					name: "password",
					label: "Password",
					inputType: "password" as const,
					required: true,
				},
			],
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
			version: "1",
			modals: {
				"auth-form": {
					title: "Authentication Setup",
					description: "Choose authentication method",
					submitAction: "save_auth",
					submitLabel: "Save",
					children: [
						{
							type: "select" as const,
							name: "auth_type",
							label: "Auth Type",
							options: [
								{ label: "Basic Auth", value: "basic" },
								{ label: "OAuth 2.0", value: "oauth" },
							],
						},
						{
							type: "input" as const,
							name: "username",
							label: "Username",
							required: true,
						},
						{
							type: "input" as const,
							name: "password",
							label: "Password",
							inputType: "password" as const,
							required: true,
						},
						{
							type: "input" as const,
							name: "client_id",
							label: "Client ID",
							required: true,
							if: {
								field: "auth_type",
								operator: "eq" as const,
								value: "oauth",
							},
						},
						{
							type: "input" as const,
							name: "client_secret",
							label: "Client Secret",
							inputType: "password" as const,
							required: true,
							if: {
								field: "auth_type",
								operator: "eq" as const,
								value: "oauth",
							},
						},
					],
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
			version: "1",
			modals: {
				"untyped-form": {
					title: "Platform Fields Demo",
					description: "Shows how platform sends untyped fields",
					submitAction: "save_fields",
					submitLabel: "Save",
					children: [
						{ type: "text", name: "field1", label: "Text-as-Input" } as any,
						{ type: "textarea", name: "notes", label: "Notes" } as any,
						{ type: "text", content: "Static text" } as any,
					],
				},
			},
		},
		status: "pending",
		onSubmit: fn(async () => {}),
	},
};
