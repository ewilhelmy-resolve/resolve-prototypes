import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FeedbackSection } from "./FeedbackSection";

const meta: Meta<typeof FeedbackSection> = {
	component: FeedbackSection,
	title: "Features/Tickets/Feedback Section",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Floating feedback overlay for collecting user feedback on AI responses. Features animated entrance, reason badges, and required text input.",
			},
		},
	},
	args: {
		onSubmit: fn(),
		onCancel: fn(),
	},
	decorators: [
		(Story) => (
			<div className="relative h-[400px] w-full bg-background">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof FeedbackSection>;

export const Visible: Story = {
	args: {
		show: true,
	},
};

export const Hidden: Story = {
	args: {
		show: false,
	},
};

export const Interactive: Story = {
	args: {
		show: true,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Try selecting reason badges and entering feedback text. Submit button enables when text is entered.",
			},
		},
	},
};
