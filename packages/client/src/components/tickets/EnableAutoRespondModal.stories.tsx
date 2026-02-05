import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { EnableAutoRespondModal } from "./EnableAutoRespondModal";

const meta: Meta<typeof EnableAutoRespondModal> = {
	component: EnableAutoRespondModal,
	title: "Features/Tickets/Enable Auto-Respond Modal",
	tags: ["autodocs"],
	args: {
		open: true,
		onOpenChange: fn(),
		onEnable: fn(),
		onAutoRespondEnabled: fn(),
	},
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Modal for confirming Auto-Respond enablement. Shows AI response preview and explains what happens when enabled.",
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof EnableAutoRespondModal>;

const sampleAiResponse = {
	content: `Hi {name},

Thank you for reaching out about your email signature. I'd be happy to help you update it to reflect your new role.

Here are the steps to update your email signature:

• Open Outlook and navigate to File > Options > Mail
• Click on "Signatures" button
• Select your existing signature or create a new one
• Update your information (name, contact details)
• Click OK to save and apply to new messages

Please let me know if these steps resolve your issue. If you need any additional assistance with formatting or have questions, I'm here to help!`,
	kbArticles: [
		{ id: "KB0004", title: "Email Signature Configuration Guide" },
		{ id: "KB0012", title: "Outlook Profile Settings" },
	],
	confidenceScore: 92,
};

export const WithAiResponse: Story = {
	args: {
		ticketGroupName: "Email Signatures",
		openTicketsCount: 14,
		aiResponse: sampleAiResponse,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Modal with AI response preview showing the automated response that will be sent.",
			},
		},
	},
};

export const EmptyState: Story = {
	args: {
		ticketGroupName: "Email Signatures",
		openTicketsCount: 14,
		aiResponse: undefined,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Empty state when no AI response is available. The Enable button is disabled.",
			},
		},
	},
};

export const NoOpenTickets: Story = {
	args: {
		ticketGroupName: "Password Resets",
		openTicketsCount: 0,
		aiResponse: sampleAiResponse,
	},
	parameters: {
		docs: {
			description: {
				story: "Modal when there are no currently open tickets in the group.",
			},
		},
	},
};

export const HighConfidence: Story = {
	args: {
		ticketGroupName: "VPN Issues",
		openTicketsCount: 3,
		aiResponse: {
			...sampleAiResponse,
			confidenceScore: 98,
		},
	},
	parameters: {
		docs: {
			description: {
				story: "Modal with a high confidence AI response.",
			},
		},
	},
};
