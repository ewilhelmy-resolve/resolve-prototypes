import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { TicketDetailHeader } from "./TicketDetailHeader";

const meta: Meta<typeof TicketDetailHeader> = {
	component: TicketDetailHeader,
	title: "Features/Tickets/Ticket Detail Header",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Full-width header for ticket detail pages. Includes back navigation, ticket ID display, up/down navigation between tickets, and Review AI response button.",
			},
		},
	},
	args: {
		onReviewAIResponse: fn(),
		onBack: fn(),
		onPrevious: fn(),
		onNext: fn(),
	},
	decorators: [
		(Story) => (
			<MemoryRouter>
				<Story />
			</MemoryRouter>
		),
	],
};

export default meta;
type Story = StoryObj<typeof TicketDetailHeader>;

const ticketIds = ["ticket-1", "ticket-2", "ticket-3", "ticket-4", "ticket-5"];

export const Default: Story = {
	args: {
		ticketId: "ticket-3",
		externalId: "INC-1003",
		clusterId: "cluster-123",
		ticketIds,
	},
};

export const FirstTicket: Story = {
	args: {
		ticketId: "ticket-1",
		externalId: "INC-1001",
		clusterId: "cluster-123",
		ticketIds,
	},
	parameters: {
		docs: {
			description: {
				story: "Previous button disabled when on first ticket.",
			},
		},
	},
};

export const LastTicket: Story = {
	args: {
		ticketId: "ticket-5",
		externalId: "INC-1005",
		clusterId: "cluster-123",
		ticketIds,
	},
	parameters: {
		docs: {
			description: {
				story: "Next button disabled when on last ticket.",
			},
		},
	},
};

export const SingleTicket: Story = {
	args: {
		ticketId: "ticket-1",
		externalId: "INC-1001",
		clusterId: "cluster-123",
		ticketIds: ["ticket-1"],
	},
	parameters: {
		docs: {
			description: {
				story: "Both navigation buttons disabled when only one ticket.",
			},
		},
	},
};

export const NoCluster: Story = {
	args: {
		ticketId: "ticket-2",
		externalId: "INC-1002",
		ticketIds,
	},
	parameters: {
		docs: {
			description: {
				story: "Without clusterId, back navigates to /tickets.",
			},
		},
	},
};

export const LongExternalId: Story = {
	args: {
		ticketId: "ticket-3",
		externalId: "SERVICENOW-REQ-2024-00001234",
		clusterId: "cluster-123",
		ticketIds,
	},
};
