import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import {
	AlertTriangle,
	CheckCircle,
	Lightbulb,
	WandSparkles,
	XCircle,
} from "lucide-react";
import { RecommendationAlert } from "./RecommendationAlert";

const meta: Meta<typeof RecommendationAlert> = {
	component: RecommendationAlert,
	title: "Features/Tickets/Recommendation Alert",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Configurable alert card for displaying recommendations with icon, title, description, and action button. Supports warning, info, success, and error variants.",
			},
		},
	},
	args: {
		onButtonClick: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof RecommendationAlert>;

export const Warning: Story = {
	args: {
		title: "Knowledge Gap Detected",
		description:
			"No knowledge articles found for this cluster. Rita recommends creating one to enable Auto-Answer.",
		icon: WandSparkles,
		buttonLabel: "Create Knowledge Article",
		variant: "warning",
	},
};

export const Info: Story = {
	args: {
		title: "New Feature Available",
		description:
			"Auto-respond is now available for this cluster. Enable it to automatically respond to common tickets.",
		icon: Lightbulb,
		buttonLabel: "Enable Auto-Respond",
		variant: "info",
	},
};

export const Success: Story = {
	args: {
		title: "Automation Ready",
		description:
			"This cluster has sufficient validation data. You can now enable full automation.",
		icon: CheckCircle,
		buttonLabel: "Enable Automation",
		variant: "success",
	},
};

export const ErrorVariant: Story = {
	args: {
		title: "Action Required",
		description:
			"Some tickets in this cluster failed to process. Review and retry the failed items.",
		icon: XCircle,
		buttonLabel: "Review Failed Items",
		variant: "error",
	},
};

export const CustomWarning: Story = {
	args: {
		title: "Low Confidence Score",
		description:
			"The AI confidence for this cluster is below 70%. Consider adding more training data.",
		icon: AlertTriangle,
		buttonLabel: "Add Training Data",
		variant: "warning",
	},
};
