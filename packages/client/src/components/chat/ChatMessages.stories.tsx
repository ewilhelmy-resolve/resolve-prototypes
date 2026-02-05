import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
	Task,
	TaskContent,
	TaskItem,
	TaskTrigger,
} from "@/components/ai-elements/task";
import { Citations } from "@/components/citations";
import { CitationProvider } from "@/contexts/CitationContext";
import { formatAbsoluteTime } from "@/lib/date-utils";
import type { GroupedChatMessage } from "@/stores/conversationStore";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

const meta: Meta = {
	title: "Features/Chat/Messages",
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Message components used in ChatV1Content showing different variants: simple messages, grouped messages with reasoning, sources, and tasks.",
			},
		},
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<CitationProvider>
					<Story />
				</CitationProvider>
			</QueryClientProvider>
		),
	],
};

export default meta;

// Helper component for rendering grouped messages
function GroupedMessageExample({
	message,
	showTimestamp = false,
}: {
	message: GroupedChatMessage;
	showTimestamp?: boolean;
}) {
	const [isHovering, setIsHovering] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	const handleCopy = () => {
		const text = message.parts.map((part) => part.message).join("\n\n");
		navigator.clipboard.writeText(text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const hasTextContent = message.parts.some(
		(part) => part.message && part.message.trim().length > 0,
	);

	const isReasoningOnly = message.parts.every(
		(part) =>
			part.metadata?.reasoning &&
			!part.message?.trim() &&
			!part.metadata?.sources?.length &&
			!part.metadata?.tasks?.length,
	);

	return (
		<Message from={message.role} className={isReasoningOnly ? "py-1" : ""}>
			<div
				role="group"
				className="flex flex-col w-full"
				onMouseEnter={() => setIsHovering(true)}
				onMouseLeave={() => setIsHovering(false)}
			>
				<MessageContent variant="flat" className={isReasoningOnly ? "p-0" : ""}>
					{message.parts.map((part) => (
						<Fragment key={part.id}>
							{/* Reasoning */}
							{part.metadata?.reasoning && (
								<Reasoning className={isReasoningOnly ? "mb-0" : ""}>
									<ReasoningTrigger title={part.metadata.reasoning.title} />
									<ReasoningContent>
										{part.metadata.reasoning.content}
									</ReasoningContent>
								</Reasoning>
							)}

							{/* Text content */}
							{part.message && part.message.trim().length > 0 && (
								<Response>{part.message}</Response>
							)}

							{/* Sources */}
							{part.metadata?.sources && (
								<Citations
									sources={part.metadata.sources}
									messageId={part.id}
									variant={part.metadata?.citation_variant}
								/>
							)}

							{/* Tasks */}
							{part.metadata?.tasks && (
								<div className="mt-4 space-y-2">
									{part.metadata.tasks.map((task: any, i: number) => (
										<Task key={i} defaultOpen={task.defaultOpen || i === 0}>
											<TaskTrigger title={task.title} />
											<TaskContent>
												{task.items.map((item: string, j: number) => (
													<TaskItem key={j}>{item}</TaskItem>
												))}
											</TaskContent>
										</Task>
									))}
								</div>
							)}
						</Fragment>
					))}
				</MessageContent>

				{/* Actions and timestamp */}
				{message.role === "assistant" && !isReasoningOnly && (
					<div className="flex items-center justify-between gap-2">
						{hasTextContent ? (
							<Actions>
								<Action onClick={handleCopy} tooltip="Copy message">
									{isCopied ? (
										<CheckIcon className="size-3" />
									) : (
										<CopyIcon className="size-3" />
									)}
								</Action>
							</Actions>
						) : (
							<div />
						)}

						{showTimestamp && (
							<div
								className={`text-xs text-gray-500 transition-opacity ${
									isHovering ? "opacity-100" : "opacity-0"
								}`}
							>
								{formatAbsoluteTime(message.timestamp)}
							</div>
						)}
					</div>
				)}

				{message.role === "user" && showTimestamp && (
					<div
						className={`text-xs text-gray-500 mt-1 transition-opacity ${
							isHovering ? "opacity-100" : "opacity-0"
						}`}
					>
						{formatAbsoluteTime(message.timestamp)}
					</div>
				)}
			</div>
		</Message>
	);
}

type Story = StoryObj;

export const SimpleUserMessage: Story = {
	render: () => (
		<Message from="user">
			<MessageContent variant="contained">
				<Response>
					Can you explain what FAQ questions we have about the company update?
				</Response>
			</MessageContent>
		</Message>
	),
	parameters: {
		docs: {
			description: {
				story: "Basic user message with contained variant styling",
			},
		},
	},
};

export const SimpleAssistantMessage: Story = {
	render: () => {
		const [isCopied, setIsCopied] = useState(false);

		return (
			<Message from="assistant">
				<MessageContent variant="flat">
					<Response>
						Here are some of the most frequently asked questions about the
						recent organizational changes.
					</Response>
				</MessageContent>
				<Actions>
					<Action
						onClick={() => {
							setIsCopied(true);
							setTimeout(() => setIsCopied(false), 2000);
						}}
						tooltip="Copy message"
					>
						{isCopied ? (
							<CheckIcon className="size-3" />
						) : (
							<CopyIcon className="size-3" />
						)}
					</Action>
				</Actions>
			</Message>
		);
	},
	parameters: {
		docs: {
			description: {
				story: "Assistant message with flat variant and copy action",
			},
		},
	},
};

export const MessageWithReasoning: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-1",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message: "",
						metadata: {
							reasoning: {
								title: "Searching knowledge base",
								content:
									"Looking through uploaded documents to find information about the company FAQ...",
							},
						},
					},
					{
						id: "part-2",
						message:
							"Here are some of the most frequently asked questions about the recent organizational changes.",
					},
				],
			}}
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Assistant message with reasoning section (collapsible)",
			},
		},
	},
};

export const MessageWithSources: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-2",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message:
							"The organizational restructuring will be completed by the end of Q2 2024.",
					},
					{
						id: "part-2",
						message: "",
						metadata: {
							sources: [
								{
									title: "Company Update FAQ",
									url: "https://example.com/update-faq.pdf",
									snippet:
										"The restructuring is expected to complete by end of Q2 2024...",
								},
								{
									title: "Company Announcement",
									url: "https://example.com/announcement",
									snippet: "We are excited to announce the organizational update...",
								},
							],
						},
					},
				],
			}}
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Assistant message with source citations",
			},
		},
	},
};

export const MessageWithTasks: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-3",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message:
							"I found several key points about the update. Let me organize them for you:",
					},
					{
						id: "part-2",
						message: "",
						metadata: {
							tasks: [
								{
									title: "Immediate Changes",
									defaultOpen: true,
									items: [
										"New reporting structure in effect immediately",
										"Updated org chart will be distributed",
										"Email addresses will remain the same",
									],
								},
								{
									title: "Employment Terms",
									defaultOpen: false,
									items: [
										"Existing employment terms remain intact",
										"Benefits packages will be reviewed in Q3",
										"No immediate changes to compensation",
									],
								},
							],
						},
					},
				],
			}}
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Assistant message with collapsible task lists",
			},
		},
	},
};

export const SystemHealthCheck: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-health",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message: "",
						metadata: {
							reasoning: {
								title: "Running diagnostics",
								content:
									"Performing system health check and gathering performance metrics...",
							},
						},
					},
					{
						id: "part-2",
						message:
							'# Analysis Complete ✅\n\nI\'ve successfully processed your request: **"hi there"**\n\n## Summary\n\n• **Documents processed**: 0\n• **Status**: ✅ Completed successfully  \n• **Response time**: ~1 seconds\n\n## Key Findings\n\n1. **System health check** passed\n2. **Security scan** completed - no issues found\n3. **Performance metrics** within normal range',
					},
					{
						id: "part-3",
						message: "",
						metadata: {
							tasks: [
								{
									title: "Example automation script",
									defaultOpen: false,
									items: [
										"systemctl status nginx",
										"curl -I https://your-app.com/health",
									],
								},
							],
						},
					},
				],
			}}
			showTimestamp
		/>
	),
	parameters: {
		docs: {
			description: {
				story:
					"System health check message with markdown formatting, status indicators, and code examples",
			},
		},
	},
};

export const TroubleshootingSteps: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-troubleshoot",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message:
							"I found some troubleshooting steps for your issue. Let me walk you through the resolution process:",
					},
					{
						id: "part-2",
						message: "",
						metadata: {
							tasks: [
								{
									title: "Step 1: Check Service Status",
									defaultOpen: true,
									items: [
										"Verify the service is running: systemctl status myapp",
										"Check for any error messages in the output",
										"Restart if needed: sudo systemctl restart myapp",
									],
								},
								{
									title: "Step 2: Review Logs",
									defaultOpen: false,
									items: [
										"Check application logs: tail -f /var/log/myapp.log",
										"Look for ERROR or WARN level messages",
										"Note the timestamp of any issues",
									],
								},
								{
									title: "Step 3: Verify Configuration",
									defaultOpen: false,
									items: [
										"Check config file syntax: myapp --validate-config",
										"Ensure all required environment variables are set",
										"Compare with working configuration backup",
									],
								},
							],
						},
					},
					{
						id: "part-3",
						message: "",
						metadata: {
							sources: [
								{
									title: "Troubleshooting Guide.pdf",
									url: "https://example.com/troubleshooting.pdf",
									snippet: "Common issues and their resolutions...",
								},
								{
									title: "Service Configuration Manual",
									url: "https://example.com/config-manual",
									snippet: "Configuration best practices and examples...",
								},
							],
						},
					},
				],
			}}
			showTimestamp
		/>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Multi-step troubleshooting guide with collapsible steps and documentation sources",
			},
		},
	},
};

export const CodeExample: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-code",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message:
							"Here's how to implement authentication in your React application:\n\n```typescript\nimport { useAuth } from '@/hooks/useAuth';\n\nfunction LoginForm() {\n  const { login, isLoading } = useAuth();\n  \n  const handleSubmit = async (e) => {\n    e.preventDefault();\n    await login(email, password);\n  };\n  \n  return (\n    <form onSubmit={handleSubmit}>\n      {/* form fields */}\n    </form>\n  );\n}\n```\n\nKey points to remember:\n- Always validate user input\n- Use secure password hashing\n- Implement rate limiting",
					},
					{
						id: "part-2",
						message: "",
						metadata: {
							sources: [
								{
									title: "Authentication Best Practices",
									url: "https://example.com/auth-guide",
									snippet:
										"Security guidelines for authentication implementation...",
								},
							],
						},
					},
				],
			}}
			showTimestamp
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Message with code examples and technical documentation",
			},
		},
	},
};

export const ListsAndTables: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-lists",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message:
							"# Environment Configuration\n\n## Required Environment Variables\n\n| Variable | Description | Example |\n|----------|-------------|----------|\n| `API_URL` | Backend API endpoint | `https://api.example.com` |\n| `AUTH_SECRET` | JWT signing secret | `your-secret-key-here` |\n| `DB_HOST` | Database hostname | `localhost:5432` |\n\n## Setup Checklist\n\n✅ Install dependencies  \n✅ Configure environment variables  \n⏳ Run database migrations  \n⏳ Start development server  \n\n## Available Commands\n\n- `npm run dev` - Start development server\n- `npm run build` - Build for production\n- `npm run test` - Run test suite\n- `npm run lint` - Check code quality",
					},
				],
			}}
			showTimestamp
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Message with markdown tables, checklists, and formatted lists",
			},
		},
	},
};

export const ErrorMessage: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-error",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message: "",
						metadata: {
							reasoning: {
								title: "Error encountered",
								content:
									"Failed to retrieve information from the knowledge base. Connection timeout.",
							},
						},
					},
					{
						id: "part-2",
						message:
							"⚠️ **Unable to Complete Request**\n\nI encountered an issue while processing your request:\n\n**Error**: Connection timeout while searching knowledge base\n\n**What you can do**:\n1. Check your internet connection\n2. Try again in a few moments\n3. Contact support if the issue persists\n\nI'm here to help once the connection is restored.",
					},
				],
			}}
			showTimestamp
		/>
	),
	parameters: {
		docs: {
			description: {
				story: "Error message with reasoning and helpful troubleshooting steps",
			},
		},
	},
};

export const SuccessWithMetrics: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-metrics",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message:
							"# Deployment Successful 🚀\n\n## Deployment Summary\n\n✅ **Status**: Deployed successfully  \n📦 **Version**: v2.4.1  \n⏱️ **Duration**: 3m 42s  \n🌍 **Environment**: Production\n\n## Metrics\n\n- **Build time**: 1m 15s\n- **Tests passed**: 247/247\n- **Coverage**: 94.2%\n- **Bundle size**: 2.3 MB (↓ 150 KB)\n\n## What's New\n\n• Fixed authentication bug in Safari\n• Improved page load performance by 30%\n• Added dark mode toggle\n• Updated dependencies",
					},
					{
						id: "part-2",
						message: "",
						metadata: {
							sources: [
								{
									title: "Deployment Log",
									url: "https://example.com/deploy-log",
									snippet: "Detailed deployment information and metrics...",
								},
								{
									title: "Release Notes v2.4.1",
									url: "https://example.com/releases/2.4.1",
									snippet: "Complete changelog and breaking changes...",
								},
							],
						},
					},
				],
			}}
			showTimestamp
		/>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Success message with metrics, emojis, and deployment information",
			},
		},
	},
};

export const ComplexMessage: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-4",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message: "",
						metadata: {
							reasoning: {
								title: "Done",
								content:
									"Searched through company documentation and found relevant FAQs",
							},
						},
					},
					{
						id: "part-2",
						message:
							"Here are some of the most frequently asked questions about the recent organizational changes:",
					},
					{
						id: "part-3",
						message: "",
						metadata: {
							tasks: [
								{
									title: "What will change immediately?",
									defaultOpen: true,
									items: [
										"The new reporting structure is in effect immediately. You will receive an updated org chart showing where you belong moving forward.",
									],
								},
								{
									title: "Will my employment terms change?",
									items: ["No, your existing employment terms remain intact."],
								},
								{
									title: "Will payroll change?",
									items: [
										"Payroll processes and schedule will remain the same until the end of this year.",
									],
								},
							],
						},
					},
					{
						id: "part-4",
						message: "",
						metadata: {
							sources: [
								{
									title: "Company Update FAQ.pdf",
									url: "https://example.com/update-faq.pdf",
									snippet:
										"Frequently asked questions about the recent organizational changes...",
								},
							],
						},
					},
				],
			}}
			showTimestamp
		/>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Complex message with reasoning, text, tasks, and sources combined",
			},
		},
	},
};

export const ReasoningOnlyMessage: Story = {
	render: () => (
		<GroupedMessageExample
			message={{
				id: "msg-5",
				role: "assistant",
				timestamp: new Date(),
				isGroup: true,
				parts: [
					{
						id: "part-1",
						message: "",
						metadata: {
							reasoning: {
								title: "Processing request",
								content: "Analyzing your question and searching knowledge base...",
							},
						},
					},
				],
			}}
		/>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Reasoning-only message (compact styling, no copy button, no timestamp)",
			},
		},
	},
};

export const Conversation: Story = {
	render: () => (
		<div className="space-y-4 max-w-4xl">
			<Message from="user">
				<MessageContent variant="contained">
					<Response>
						Can you explain what FAQ questions we have about the company update?
					</Response>
				</MessageContent>
			</Message>

			<GroupedMessageExample
				message={{
					id: "msg-conv-1",
					role: "assistant",
					timestamp: new Date(Date.now() - 5000),
					isGroup: true,
					parts: [
						{
							id: "part-1",
							message: "",
							metadata: {
								reasoning: {
									title: "Done",
									content: "Searched knowledge base for company FAQ information",
								},
							},
						},
						{
							id: "part-2",
							message:
								"No articles were found to look up. Please upload an article to use as a reference.",
						},
					],
				}}
				showTimestamp
			/>

			<Message from="user">
				<MessageContent variant="contained">
					<Response>about the company update</Response>
				</MessageContent>
			</Message>

			<GroupedMessageExample
				message={{
					id: "msg-conv-2",
					role: "assistant",
					timestamp: new Date(),
					isGroup: true,
					parts: [
						{
							id: "part-3",
							message: "",
							metadata: {
								reasoning: {
									title: "Done",
									content: "Found relevant company documentation",
								},
							},
						},
						{
							id: "part-4",
							message:
								"Here are some of the most frequently asked questions about the recent organizational changes:",
						},
						{
							id: "part-5",
							message: "",
							metadata: {
								tasks: [
									{
										title: "What will change immediately?",
										defaultOpen: true,
										items: [
											"The new reporting structure is in effect immediately. You will receive an updated org chart showing where you belong moving forward.",
										],
									},
									{
										title: "Will my employment terms change?",
										items: ["No, your existing employment terms remain intact."],
									},
									{
										title: "Will payroll change?",
										items: [
											"Payroll processes and schedule will remain the same until the end of this year.",
										],
									},
									{
										title: "Will our Travel & Expense policy change?",
										items: [
											"Travel and expense policies will be reviewed and communicated in Q3.",
										],
									},
								],
							},
						},
					],
				}}
				showTimestamp
			/>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "Full conversation flow showing multiple message exchanges",
			},
		},
	},
};
