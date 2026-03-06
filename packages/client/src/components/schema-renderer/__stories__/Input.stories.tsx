import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Form Components/Input",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const Default: Story = {
	args: {
		schema: {
			type: "Input",
			props: { name: "username", label: "Username" },
		},
	},
};

export const WithPlaceholder: Story = {
	args: {
		schema: {
			type: "Input",
			props: {
				name: "search",
				label: "Search",
				placeholder: "Type to search...",
			},
		},
	},
};

export const Required: Story = {
	args: {
		schema: {
			type: "Input",
			props: {
				name: "email",
				label: "Email Address",
				required: true,
			},
		},
	},
};

export const EmailType: Story = {
	args: {
		schema: {
			type: "Input",
			props: {
				name: "email",
				label: "Email",
				inputType: "email",
				placeholder: "user@example.com",
			},
		},
	},
};

export const NumberType: Story = {
	args: {
		schema: {
			type: "Input",
			props: {
				name: "age",
				label: "Age",
				inputType: "number",
				placeholder: "25",
			},
		},
	},
};

export const PasswordType: Story = {
	args: {
		schema: {
			type: "Input",
			props: {
				name: "password",
				label: "Password",
				inputType: "password",
				placeholder: "Enter password",
			},
		},
	},
};

export const TextareaType: Story = {
	args: {
		schema: {
			type: "Input",
			props: {
				name: "description",
				label: "Description",
				inputType: "textarea",
				placeholder: "Enter a detailed description...",
			},
		},
	},
};

export const WithDefaultValue: Story = {
	args: {
		schema: {
			type: "Input",
			props: {
				name: "name",
				label: "Display Name",
				defaultValue: "John Doe",
			},
		},
	},
};

export const AllTypes: Story = {
	render: () => (
		<div className="flex flex-col gap-4 max-w-md">
			<SchemaStoryWrapper
				schema={{
					type: "Input",
					props: {
						name: "text",
						label: "Text",
						inputType: "text",
						placeholder: "Plain text",
					},
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					type: "Input",
					props: {
						name: "email",
						label: "Email",
						inputType: "email",
						placeholder: "user@example.com",
					},
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					type: "Input",
					props: {
						name: "number",
						label: "Number",
						inputType: "number",
						placeholder: "42",
					},
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					type: "Input",
					props: {
						name: "password",
						label: "Password",
						inputType: "password",
						placeholder: "Secret",
					},
				}}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={{
					type: "Input",
					props: {
						name: "textarea",
						label: "Textarea",
						inputType: "textarea",
						placeholder: "Multi-line input",
					},
				}}
				onAction={fn()}
			/>
		</div>
	),
};
