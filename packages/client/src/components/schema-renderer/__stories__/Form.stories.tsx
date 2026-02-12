import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import type { UISchema } from "@/types/uiSchema";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Form Components/Form",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

const defaultFormSchema: UISchema = {
	version: "1",
	components: [
		{
			type: "form",
			submitAction: "submit_user",
			children: [
				{
					type: "input",
					name: "name",
					label: "Name",
					placeholder: "Enter your name",
					required: true,
				},
				{
					type: "input",
					name: "email",
					label: "Email",
					inputType: "email",
					placeholder: "user@example.com",
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
};

export const Default: Story = {
	args: {
		schema: defaultFormSchema,
	},
};

export const CustomSubmitLabel: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "form",
					submitAction: "save_config",
					submitLabel: "Save Configuration",
					children: [
						{
							type: "input",
							name: "host",
							label: "Host",
							placeholder: "api.example.com",
						},
						{
							type: "input",
							name: "port",
							label: "Port",
							inputType: "number",
							placeholder: "8080",
						},
						{
							type: "select",
							name: "protocol",
							label: "Protocol",
							options: [
								{ label: "HTTPS", value: "https" },
								{ label: "HTTP", value: "http" },
							],
						},
					],
				},
			],
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
