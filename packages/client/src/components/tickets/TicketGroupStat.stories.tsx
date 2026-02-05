import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { TicketGroupStat } from "./TicketGroupStat";

const meta: Meta<typeof TicketGroupStat> = {
	component: TicketGroupStat,
	title: "Features/Tickets/Ticket Group Stat",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Card displaying ticket group statistics with count, progress bar, and knowledge base status badge. Clickable for navigation.",
			},
		},
	},
	args: {
		onClick: fn(),
	},
	decorators: [
		(Story) => (
			<MemoryRouter>
				<div className="w-72">
					<Story />
				</div>
			</MemoryRouter>
		),
	],
};

export default meta;
type Story = StoryObj<typeof TicketGroupStat>;

export const Default: Story = {
	args: {
		id: "cluster-123",
		title: "Password Reset Issues",
		count: 45,
		knowledgeStatus: "FOUND",
	},
};

export const KnowledgeFound: Story = {
	args: {
		id: "cluster-124",
		title: "Email Access Problems",
		count: 32,
		knowledgeStatus: "FOUND",
	},
};

export const KnowledgeGap: Story = {
	args: {
		id: "cluster-125",
		title: "VPN Connection Failures",
		count: 18,
		knowledgeStatus: "GAP",
	},
};

export const Pending: Story = {
	args: {
		id: "cluster-126",
		title: "New Hardware Requests",
		count: 7,
		knowledgeStatus: "PENDING",
	},
};

export const CustomPercentages: Story = {
	args: {
		id: "cluster-127",
		title: "Software Installation",
		count: 156,
		knowledgeStatus: "FOUND",
		manualPercentage: 30,
		automatedPercentage: 70,
	},
};

export const HighAutomation: Story = {
	args: {
		id: "cluster-128",
		title: "Account Lockouts",
		count: 89,
		knowledgeStatus: "FOUND",
		manualPercentage: 10,
		automatedPercentage: 90,
	},
};

export const LongTitle: Story = {
	args: {
		id: "cluster-129",
		title: "Issues with Microsoft Office 365 Integration and Sharepoint Access",
		count: 23,
		knowledgeStatus: "GAP",
	},
};

export const LargeCount: Story = {
	args: {
		id: "cluster-130",
		title: "General IT Support",
		count: 1247,
		knowledgeStatus: "FOUND",
		manualPercentage: 45,
		automatedPercentage: 55,
	},
};
