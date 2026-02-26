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
					"Full-width header for ticket detail pages. Includes back navigation, ticket ID display, position indicator, up/down navigation between tickets, and Review AI response button.",
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

export const Default: Story = {
	args: {
		ticketId: "ticket-3",
		externalId: "INC-1003",
		clusterId: "cluster-123",
		prevTicketId: "ticket-2",
		nextTicketId: "ticket-4",
		currentPosition: 2,
		totalTickets: 42,
		searchParams: "sort=created_at&sort_dir=desc&tab=needs_response",
	},
};

export const FirstTicket: Story = {
	args: {
		ticketId: "ticket-1",
		externalId: "INC-1001",
		clusterId: "cluster-123",
		prevTicketId: null,
		nextTicketId: "ticket-2",
		currentPosition: 0,
		totalTickets: 42,
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
		prevTicketId: "ticket-4",
		nextTicketId: null,
		currentPosition: 41,
		totalTickets: 42,
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
		prevTicketId: null,
		nextTicketId: null,
		currentPosition: 0,
		totalTickets: 1,
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
		prevTicketId: "ticket-1",
		nextTicketId: "ticket-3",
		currentPosition: 1,
		totalTickets: 5,
	},
	parameters: {
		docs: {
			description: {
				story: "Without clusterId, back navigates to /tickets.",
			},
		},
	},
};

export const NoNavigationContext: Story = {
	args: {
		ticketId: "ticket-3",
		externalId: "SERVICENOW-REQ-2024-00001234",
		clusterId: "cluster-123",
	},
	parameters: {
		docs: {
			description: {
				story:
					"Direct URL access without navigation context. No position indicator, both buttons disabled.",
			},
		},
	},
};
