import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Sparkles, Zap, Network, Bot } from "lucide-react";
import { AutoPilotRecommendations } from "./AutoPilotRecommendations";

const meta: Meta<typeof AutoPilotRecommendations> = {
	component: AutoPilotRecommendations,
	title: "Features/Tickets/AutoPilot Recommendations",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"List of ticket automation recommendations. Shows available automation options with Enable buttons or Coming Soon badges.",
			},
		},
	},
	args: {
		onEnableClick: fn(),
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
type Story = StoryObj<typeof AutoPilotRecommendations>;

export const Default: Story = {
	args: {},
};

export const AllEnabled: Story = {
	args: {
		items: [
			{
				type: "auto-respond",
				title: "Auto-Respond",
				icon: Sparkles,
				color: "text-purple-500",
			},
			{
				type: "auto-populate",
				title: "Auto-Populate",
				icon: Zap,
				color: "text-green-500",
			},
			{
				type: "auto-resolve",
				title: "Auto-Resolve",
				icon: Network,
				color: "text-blue-500",
			},
		],
	},
};

export const AllComingSoon: Story = {
	args: {
		items: [
			{
				type: "auto-respond",
				title: "Auto-Respond",
				icon: Sparkles,
				color: "text-purple-500",
				comingSoon: true,
			},
			{
				type: "auto-populate",
				title: "Auto-Populate",
				icon: Zap,
				color: "text-green-500",
				comingSoon: true,
			},
			{
				type: "auto-resolve",
				title: "Auto-Resolve",
				icon: Network,
				color: "text-blue-500",
				comingSoon: true,
			},
		],
	},
};

export const SingleItem: Story = {
	args: {
		items: [
			{
				type: "auto-respond",
				title: "Auto-Respond",
				icon: Sparkles,
				color: "text-purple-500",
			},
		],
	},
};

export const CustomItems: Story = {
	args: {
		items: [
			{
				type: "auto-respond",
				title: "Smart Reply",
				icon: Bot,
				color: "text-indigo-500",
			},
			{
				type: "auto-populate",
				title: "Auto-Fill Fields",
				icon: Zap,
				color: "text-amber-500",
				comingSoon: true,
			},
		],
	},
};

export const WithoutHeader: Story = {
	args: {
		hideHeader: true,
	},
};
