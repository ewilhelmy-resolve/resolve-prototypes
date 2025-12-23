import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ChatMessage } from "./ChatMessage";
import { SSEProvider } from "../contexts/SSEContext";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

// Wrapper with all required providers
const StorybookProviders = ({ children }: { children: React.ReactNode }) => (
	<QueryClientProvider client={queryClient}>
		<MemoryRouter>
			<SSEProvider apiUrl="http://localhost:3000" enabled={false}>
				{children}
			</SSEProvider>
		</MemoryRouter>
	</QueryClientProvider>
);

const meta: Meta<typeof ChatMessage> = {
	component: ChatMessage,
	title: "Chat/ChatMessage",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<StorybookProviders>
				<div className="w-full p-4 bg-gray-50">
					<Story />
				</div>
			</StorybookProviders>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ChatMessage>;

export const UserMessage: Story = {
	args: {
		id: "msg-1",
		message: "How do I reset my password?",
		role: "user",
		initialStatus: "completed",
		timestamp: new Date(),
	},
};

export const AssistantMessage: Story = {
	args: {
		id: "msg-2",
		message:
			"To reset your password, follow these steps:\n\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your email for the reset link\n5. Follow the link to create a new password",
		role: "assistant",
		timestamp: new Date(),
	},
};

export const UserMessagePending: Story = {
	args: {
		id: "msg-3",
		message: "What's the VPN setup process?",
		role: "user",
		initialStatus: "pending",
		timestamp: new Date(),
	},
};

export const UserMessageProcessing: Story = {
	args: {
		id: "msg-4",
		message: "How do I connect to the company network?",
		role: "user",
		initialStatus: "processing",
		timestamp: new Date(),
	},
};

export const UserMessageFailed: Story = {
	args: {
		id: "msg-5",
		message: "What are the security policies?",
		role: "user",
		initialStatus: "failed",
		timestamp: new Date(),
	},
};

export const LongMessage: Story = {
	args: {
		id: "msg-7",
		message: `Here's a comprehensive guide to setting up your development environment:

## Prerequisites
- Node.js 18+ installed
- Git configured with SSH keys
- Access to the company VPN

## Steps

### 1. Clone the Repository
\`\`\`bash
git clone git@github.com:company/project.git
cd project
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment
Copy the example environment file and update with your credentials:
\`\`\`bash
cp .env.example .env
\`\`\`

### 4. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

The application will be available at http://localhost:3000`,
		role: "assistant",
		timestamp: new Date(),
	},
};

export const Conversation: Story = {
	render: () => (
		<div className="space-y-0">
			<ChatMessage
				id="msg-a"
				message="How do I reset my password?"
				role="user"
				initialStatus="completed"
				timestamp={new Date(Date.now() - 60000)}
			/>
			<ChatMessage
				id="msg-b"
				message="To reset your password, go to Settings > Security > Change Password. You'll need to enter your current password and then your new password twice to confirm."
				role="assistant"
				timestamp={new Date(Date.now() - 30000)}
			/>
			<ChatMessage
				id="msg-c"
				message="Thanks! What if I forgot my current password?"
				role="user"
				initialStatus="completed"
				timestamp={new Date()}
			/>
		</div>
	),
};

export const AllStatuses: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<p className="text-sm text-gray-500 mb-2">Completed:</p>
				<ChatMessage
					id="s1"
					message="Message sent successfully"
					role="user"
					initialStatus="completed"
					timestamp={new Date()}
				/>
			</div>
			<div>
				<p className="text-sm text-gray-500 mb-2">Processing:</p>
				<ChatMessage
					id="s2"
					message="Message being processed"
					role="user"
					initialStatus="processing"
					timestamp={new Date()}
				/>
			</div>
			<div>
				<p className="text-sm text-gray-500 mb-2">Pending:</p>
				<ChatMessage
					id="s3"
					message="Message pending"
					role="user"
					initialStatus="pending"
					timestamp={new Date()}
				/>
			</div>
			<div>
				<p className="text-sm text-gray-500 mb-2">Failed:</p>
				<ChatMessage
					id="s4"
					message="Message failed"
					role="user"
					initialStatus="failed"
					timestamp={new Date()}
				/>
			</div>
		</div>
	),
};
