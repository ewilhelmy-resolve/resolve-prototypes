import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ChatInputProps } from "./ChatInput";
import { ChatInput } from "./ChatInput";

// Interactive wrapper component
function ChatInputWithState(
	args: Omit<ChatInputProps, "value" | "onChange" | "onSubmit">,
) {
	const [value, setValue] = useState("");

	return (
		<div className="min-h-[400px] flex flex-col bg-gray-50 p-4">
			<div className="flex-1 flex items-center justify-center">
				<p className="text-sm text-gray-500">
					Chat conversation would appear here
				</p>
			</div>
			<ChatInput
				{...args}
				value={value}
				onChange={setValue}
				onSubmit={async (message) => {
					console.log("Message submitted:", message);
					setValue("");
				}}
			/>
		</div>
	);
}

const meta = {
	title: "Features/Chat/Input",
	component: ChatInputWithState,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		chatStatus: {
			control: "select",
			options: ["ready", "streaming", "submitted", "error"],
			description: "Current chat status",
		},
		disabled: {
			control: "boolean",
			description: "Whether the input is disabled",
		},
		showNoKnowledgeWarning: {
			control: "boolean",
			description: "Whether to show the no knowledge warning",
		},
		isAdmin: {
			control: "boolean",
			description: "Whether the user is an admin",
		},
		placeholder: {
			control: "text",
			description: "Placeholder text for the input",
		},
	},
} satisfies Meta<typeof ChatInputWithState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default chat input ready for user interaction
 */
export const Default: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "ready",
		placeholder: "Ask me anything...",
		disabled: false,
		showNoKnowledgeWarning: false,
		isAdmin: false,
	},
};

/**
 * Chat input in streaming state (AI is responding)
 */
export const Streaming: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "streaming",
		placeholder: "Ask me anything...",
		disabled: false,
		showNoKnowledgeWarning: false,
		isAdmin: false,
	},
};

/**
 * Chat input with no knowledge warning for admin users
 */
export const NoKnowledgeAdmin: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "ready",
		placeholder: "Ask me anything...",
		disabled: true,
		showNoKnowledgeWarning: true,
		isAdmin: true,
	},
};

/**
 * Chat input with no knowledge warning for regular users
 */
export const NoKnowledgeUser: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "ready",
		placeholder: "Ask me anything...",
		disabled: true,
		showNoKnowledgeWarning: true,
		isAdmin: false,
	},
};

/**
 * Chat input in disabled state
 */
export const Disabled: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "ready",
		placeholder: "Ask me anything...",
		disabled: true,
		showNoKnowledgeWarning: false,
		isAdmin: false,
	},
};

/**
 * Chat input with custom placeholder
 */
export const CustomPlaceholder: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "ready",
		placeholder: "Type your question here...",
		disabled: false,
		showNoKnowledgeWarning: false,
		isAdmin: false,
	},
};

/**
 * Chat input with custom no knowledge message
 */
export const CustomNoKnowledgeMessage: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "ready",
		placeholder: "Ask me anything...",
		disabled: true,
		showNoKnowledgeWarning: true,
		isAdmin: true,
		noKnowledgeMessage: {
			admin: "Custom admin message: Please configure your knowledge sources.",
			user: "Custom user message: Knowledge base is not available.",
		},
	},
};

/**
 * Chat input in error state
 */
export const ErrorState: Story = {
	render: (args) => <ChatInputWithState {...args} />,
	args: {
		chatStatus: "error",
		placeholder: "Ask me anything...",
		disabled: false,
		showNoKnowledgeWarning: false,
		isAdmin: false,
	},
};
