import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import ReviewAIResponseSheet from "./ReviewAIResponseSheet";

const meta: Meta<typeof ReviewAIResponseSheet> = {
	component: ReviewAIResponseSheet,
	title: "Features/Tickets/Review AI Response Sheet",
	tags: ["autodocs"],
	args: {
		open: true,
		onOpenChange: fn(),
		onNavigate: fn(),
		onApprove: fn(),
		onReject: fn(),
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Sheet component for reviewing AI-generated ticket responses. Supports multi-ticket navigation, approval/rejection with feedback, and completion view.",
			},
			story: {
				inline: false,
				iframeHeight: 600,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof ReviewAIResponseSheet>;

const sampleTickets = [
	{
		id: "1",
		externalId: "TKT-001",
		title: "Email signature not displaying correctly",
		description:
			"My email signature is not showing up when I send emails to external contacts. I've tried updating it in Outlook settings but the changes don't seem to apply.",
		priority: "medium" as const,
	},
	{
		id: "2",
		externalId: "TKT-002",
		title: "Need to update email signature with new title",
		description:
			"I was recently promoted and need to update my email signature to reflect my new title. Please advise on how to do this.",
		priority: "low" as const,
	},
];

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
		{ id: "KB0023", title: "Corporate Branding Guidelines" },
	],
	confidenceScore: 92,
};

export const Default: Story = {
	args: {
		tickets: sampleTickets,
		currentIndex: 0,
		aiResponse: sampleAiResponse,
	},
	parameters: {
		docs: {
			description: {
				story: "Default review flow with AI response and ticket details.",
			},
		},
	},
};

export const EmptyState: Story = {
	args: {
		tickets: sampleTickets,
		currentIndex: 0,
		aiResponse: undefined,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Empty state shown when no AI response is available for the ticket.",
			},
		},
	},
};

export const SecondTicket: Story = {
	args: {
		tickets: sampleTickets,
		currentIndex: 1,
		aiResponse: sampleAiResponse,
	},
	parameters: {
		docs: {
			description: {
				story: "Reviewing the second ticket in the queue.",
			},
		},
	},
};
