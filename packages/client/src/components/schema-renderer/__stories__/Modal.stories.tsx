import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import type { UISchema } from "@/types/uiSchema";

import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Complex/Modal",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			story: {
				inline: false,
				iframeHeight: 400,
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

export const BasicModal: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{ type: "button", label: "Open Modal", opensModal: "basic" },
			],
			modals: {
				basic: {
					title: "Basic Modal",
					description: "A simple modal with text content",
					size: "md",
					children: [
						{
							type: "text",
							content: "This is the modal body content.",
						},
					],
				},
			},
		} satisfies UISchema,
	},
};

export const ModalWithForm: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "button",
					label: "Edit Profile",
					opensModal: "edit-profile",
				},
			],
			modals: {
				"edit-profile": {
					title: "Edit Profile",
					description: "Update your account information",
					size: "lg",
					submitAction: "save-profile",
					submitLabel: "Save Changes",
					children: [
						{
							type: "input",
							name: "displayName",
							label: "Display Name",
							placeholder: "Enter name",
							required: true,
						},
						{
							type: "input",
							name: "bio",
							label: "Bio",
							placeholder: "Tell us about yourself",
							inputType: "textarea",
						},
						{
							type: "select",
							name: "timezone",
							label: "Timezone",
							placeholder: "Select timezone",
							options: [
								{
									label: "UTC-8 Pacific",
									value: "America/Los_Angeles",
								},
								{
									label: "UTC-5 Eastern",
									value: "America/New_York",
								},
								{ label: "UTC+0 London", value: "Europe/London" },
								{ label: "UTC+9 Tokyo", value: "Asia/Tokyo" },
							],
						},
					],
				},
			},
		} satisfies UISchema,
	},
	parameters: {
		docs: { story: { iframeHeight: 500 } },
	},
};

export const DestructiveConfirmation: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "button",
					label: "Delete Account",
					variant: "destructive",
					opensModal: "confirm-delete",
				},
			],
			modals: {
				"confirm-delete": {
					title: "Delete Account",
					description: "This action cannot be undone.",
					size: "sm",
					submitAction: "delete-account",
					submitLabel: "Delete",
					cancelLabel: "Keep Account",
					submitVariant: "destructive",
					children: [
						{
							type: "text",
							content:
								"All your data will be permanently removed. Are you sure?",
						},
					],
				},
			},
		} satisfies UISchema,
	},
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2 p-6">
			{(["sm", "md", "lg", "xl", "full"] as const).map((size) => (
				<SchemaStoryWrapper
					key={size}
					schema={{
						version: "1",
						components: [
							{
								type: "button",
								label: `Open ${size}`,
								opensModal: `modal-${size}`,
							},
						],
						modals: {
							[`modal-${size}`]: {
								title: `${size.toUpperCase()} Modal`,
								description: `This modal uses size "${size}"`,
								size,
								children: [
									{
										type: "text",
										content: `Modal content at ${size} size.`,
									},
								],
							},
						},
					}}
					onAction={fn()}
				/>
			))}
		</div>
	),
};

export const AutoOpen: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Opens automatically on render via autoOpenModal. Used for forced credential prompts.",
			},
		},
	},
	args: {
		schema: {
			version: "1",
			components: [
				{
					type: "text",
					content: "The modal opens automatically on render.",
				},
			],
			modals: {
				credentials: {
					title: "Enter Credentials",
					description: "Authentication required to continue",
					size: "md",
					submitAction: "submit-credentials",
					submitLabel: "Authenticate",
					children: [
						{
							type: "input",
							name: "apiKey",
							label: "API Key",
							placeholder: "sk-...",
							required: true,
						},
					],
				},
			},
			autoOpenModal: "credentials",
		} satisfies UISchema,
	},
};

export const CustomLabels: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{ type: "button", label: "Open", opensModal: "custom-labels" },
			],
			modals: {
				"custom-labels": {
					title: "Confirm Changes",
					size: "md",
					submitAction: "apply-changes",
					submitLabel: "Apply Now",
					cancelLabel: "Discard",
					children: [
						{
							type: "text",
							content: "Review the changes before applying.",
						},
					],
				},
			},
		} satisfies UISchema,
	},
};
