import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FeedbackBanner } from "./feedback-banner";

const meta: Meta<typeof FeedbackBanner> = {
	component: FeedbackBanner,
	title: "Components/Feedback/Feedback Banner",
	tags: ["autodocs"],
	args: {
		onDismiss: fn(),
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["success", "destructive", "enriched"],
		},
		dismissible: {
			control: "boolean",
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[600px]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof FeedbackBanner>;

export const Success: Story = {
	args: {
		variant: "success",
		title: "Changes saved successfully!",
		description: "Your settings have been updated.",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
		title: "Failed to save changes",
		description: "Please try again or contact support.",
	},
};

export const Enriched: Story = {
	args: {
		variant: "enriched",
		title: "Data enriched!",
		description: "We found additional information for your records.",
	},
};

export const TitleOnly: Story = {
	args: {
		variant: "success",
		title: "Operation completed!",
	},
};

export const NotDismissible: Story = {
	args: {
		variant: "success",
		title: "Important notice",
		description: "This banner cannot be dismissed.",
		dismissible: false,
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<FeedbackBanner
				variant="success"
				title="Success message"
				description="Everything went well."
			/>
			<FeedbackBanner
				variant="destructive"
				title="Error message"
				description="Something went wrong."
			/>
			<FeedbackBanner
				variant="enriched"
				title="Enrichment complete"
				description="Additional data has been added."
			/>
		</div>
	),
};
