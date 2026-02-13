import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

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
			root: "btn",
			elements: {
				btn: {
					type: "Button",
					props: { label: "Open Modal", opensDialog: "basic" },
				},
				"dlg-basic": {
					type: "Form",
					props: {
						title: "Basic Modal",
						description: "A simple modal with text content",
						size: "md",
					},
					children: ["dlg-basic-text"],
				},
				"dlg-basic-text": {
					type: "Text",
					props: { content: "This is the modal body content." },
				},
			},
			dialogs: { basic: "dlg-basic" },
		},
	},
};

export const ModalWithForm: Story = {
	args: {
		schema: {
			root: "btn",
			elements: {
				btn: {
					type: "Button",
					props: { label: "Edit Profile", opensDialog: "edit-profile" },
				},
				"dlg-edit": {
					type: "Form",
					props: {
						title: "Edit Profile",
						description: "Update your account information",
						size: "lg",
						submitAction: "save-profile",
						submitLabel: "Save Changes",
					},
					children: ["input-name", "input-bio", "select-tz"],
				},
				"input-name": {
					type: "Input",
					props: {
						name: "displayName",
						label: "Display Name",
						placeholder: "Enter name",
						required: true,
					},
				},
				"input-bio": {
					type: "Input",
					props: {
						name: "bio",
						label: "Bio",
						placeholder: "Tell us about yourself",
						inputType: "textarea",
					},
				},
				"select-tz": {
					type: "Select",
					props: {
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
				},
			},
			dialogs: { "edit-profile": "dlg-edit" },
		},
	},
	parameters: {
		docs: { story: { iframeHeight: 500 } },
	},
};

export const DestructiveConfirmation: Story = {
	args: {
		schema: {
			root: "btn",
			elements: {
				btn: {
					type: "Button",
					props: {
						label: "Delete Account",
						variant: "destructive",
						opensDialog: "confirm-delete",
					},
				},
				"dlg-delete": {
					type: "Form",
					props: {
						title: "Delete Account",
						description: "This action cannot be undone.",
						size: "sm",
						submitAction: "delete-account",
						submitLabel: "Delete",
						cancelLabel: "Keep Account",
						submitVariant: "destructive",
					},
					children: ["dlg-delete-text"],
				},
				"dlg-delete-text": {
					type: "Text",
					props: {
						content: "All your data will be permanently removed. Are you sure?",
					},
				},
			},
			dialogs: { "confirm-delete": "dlg-delete" },
		},
	},
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2 p-6">
			{(["sm", "md", "lg", "xl", "full"] as const).map((size) => (
				<SchemaStoryWrapper
					key={size}
					schema={{
						root: "btn",
						elements: {
							btn: {
								type: "Button",
								props: {
									label: `Open ${size}`,
									opensDialog: `modal-${size}`,
								},
							},
							[`dlg-${size}`]: {
								type: "Form",
								props: {
									title: `${size.toUpperCase()} Modal`,
									description: `This modal uses size "${size}"`,
									size,
								},
								children: [`dlg-${size}-text`],
							},
							[`dlg-${size}-text`]: {
								type: "Text",
								props: {
									content: `Modal content at ${size} size.`,
								},
							},
						},
						dialogs: { [`modal-${size}`]: `dlg-${size}` },
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
					"Opens automatically on render via autoOpenDialog. Used for forced credential prompts.",
			},
		},
	},
	args: {
		schema: {
			root: "text",
			elements: {
				text: {
					type: "Text",
					props: {
						content: "The modal opens automatically on render.",
					},
				},
				"dlg-cred": {
					type: "Form",
					props: {
						title: "Enter Credentials",
						description: "Authentication required to continue",
						size: "md",
						submitAction: "submit-credentials",
						submitLabel: "Authenticate",
					},
					children: ["input-key"],
				},
				"input-key": {
					type: "Input",
					props: {
						name: "apiKey",
						label: "API Key",
						placeholder: "sk-...",
						required: true,
					},
				},
			},
			dialogs: { credentials: "dlg-cred" },
			autoOpenDialog: "credentials",
		},
	},
};

export const CustomLabels: Story = {
	args: {
		schema: {
			root: "btn",
			elements: {
				btn: {
					type: "Button",
					props: { label: "Open", opensDialog: "custom-labels" },
				},
				"dlg-custom": {
					type: "Form",
					props: {
						title: "Confirm Changes",
						size: "md",
						submitAction: "apply-changes",
						submitLabel: "Apply Now",
						cancelLabel: "Discard",
					},
					children: ["dlg-custom-text"],
				},
				"dlg-custom-text": {
					type: "Text",
					props: {
						content: "Review the changes before applying.",
					},
				},
			},
			dialogs: { "custom-labels": "dlg-custom" },
		},
	},
};
