import type { Meta, StoryObj } from "@storybook/react";
import AIResponseContent from "./AIResponseContent";
import type { KBArticle } from "./AIResponseContent";

const meta: Meta<typeof AIResponseContent> = {
	component: AIResponseContent,
	title: "Features/Tickets/AI Response Content",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays AI-generated response with formatted text, KB article references, and confidence score badge.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[500px]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof AIResponseContent>;

const sampleKBArticles: KBArticle[] = [
	{ id: "KB-001", title: "Password Reset Procedures" },
	{ id: "KB-002", title: "Email Access Troubleshooting" },
	{ id: "KB-003", title: "Account Recovery Guide" },
];

const sampleContent = `Hi there,

I understand you're having trouble accessing your email after resetting your password. Here are some steps that should help:

1. Clear your browser cache and cookies
2. Try using an incognito/private browsing window
3. Ensure you're using the correct email format (user@company.com)
4. Wait 5-10 minutes for the password change to propagate

If the issue persists, please contact IT support for further assistance.`;

export const HighConfidence: Story = {
	args: {
		content: sampleContent,
		kbArticles: [sampleKBArticles[0]],
		confidenceScore: 95,
	},
};

export const MediumConfidence: Story = {
	args: {
		content: sampleContent,
		kbArticles: [sampleKBArticles[0]],
		confidenceScore: 75,
	},
};

export const LowConfidence: Story = {
	args: {
		content:
			"I'm not entirely sure about this issue, but it might be related to network connectivity. Please check your internet connection and try again.",
		kbArticles: [],
		confidenceScore: 45,
	},
};

export const MultipleKBArticles: Story = {
	args: {
		content: sampleContent,
		kbArticles: sampleKBArticles,
		confidenceScore: 88,
	},
};

export const NoKBArticles: Story = {
	args: {
		content:
			"This appears to be a unique issue that I haven't seen before. I recommend escalating to the technical team for further investigation.",
		kbArticles: [],
		confidenceScore: 60,
	},
};

export const LongContent: Story = {
	args: {
		content: `Dear Customer,

Thank you for reaching out about your email access issue. I've reviewed your account and found several potential causes for this problem.

First, let me explain what typically happens during a password reset:
- The system generates a new password hash
- This hash is replicated across all authentication servers
- Session tokens from previous logins are invalidated

The issue you're experiencing could be due to:
1. Browser caching old credentials
2. Replication delay between servers
3. Cached DNS records pointing to outdated endpoints

Here's what I recommend:
1. Sign out of all devices
2. Clear your browser's saved passwords
3. Wait 15 minutes for full propagation
4. Try logging in with the new password

If you continue to experience issues, please provide:
- The exact error message you see
- The browser and version you're using
- Whether you're on VPN or direct connection

Best regards,
AI Support Assistant`,
		kbArticles: sampleKBArticles.slice(0, 2),
		confidenceScore: 92,
		className: "max-h-64",
	},
};
