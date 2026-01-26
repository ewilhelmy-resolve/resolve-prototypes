import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { EnableAutoPopulateSheet } from "./EnableAutoPopulateSheet";

const meta: Meta<typeof EnableAutoPopulateSheet> = {
	component: EnableAutoPopulateSheet,
	title: "Features/Tickets/Enable Auto-Populate Sheet",
	tags: ["autodocs"],
	args: {
		open: true,
		onOpenChange: fn(),
		onEnable: fn(),
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Sheet for enabling Auto-Populate feature. Displays a table showing current vs predicted values for ticket fields.",
			},
			story: {
				inline: false,
				iframeHeight: 500,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof EnableAutoPopulateSheet>;

const samplePredictions = [
	{
		label: "Category",
		currentValue: "General Inquiry",
		predictedValue: "Email Signature",
	},
	{
		label: "Sub Category",
		currentValue: null,
		predictedValue: "Applications",
	},
	{ label: "Priority", currentValue: null, predictedValue: "Low" },
	{
		label: "CI",
		currentValue: null,
		predictedValue: "Active Directory",
	},
	{
		label: "Business Service",
		currentValue: null,
		predictedValue: "Identity Management",
	},
];

export const WithPredictions: Story = {
	args: {
		predictions: samplePredictions,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Sheet with field predictions showing current values and AI-predicted values.",
			},
		},
	},
};

export const EmptyState: Story = {
	args: {
		predictions: undefined,
	},
	parameters: {
		docs: {
			description: {
				story: "Empty state shown when no predictions are available.",
			},
		},
	},
};

export const PartialPredictions: Story = {
	args: {
		predictions: [
			{
				label: "Category",
				currentValue: "Support Request",
				predictedValue: "Password Reset",
			},
			{ label: "Priority", currentValue: "Medium", predictedValue: "High" },
		],
	},
	parameters: {
		docs: {
			description: {
				story: "Sheet with only a few field predictions.",
			},
		},
	},
};
