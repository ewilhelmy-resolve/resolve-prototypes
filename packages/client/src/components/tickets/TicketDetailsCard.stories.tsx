import type { Meta, StoryObj } from "@storybook/react";
import type { TicketDetails } from "./TicketDetailsCard";
import TicketDetailsCard from "./TicketDetailsCard";

const meta: Meta<typeof TicketDetailsCard> = {
	component: TicketDetailsCard,
	title: "Features/Tickets/Ticket Details Card",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Card component displaying ticket details with priority badge, ID, title, and description.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="w-full">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof TicketDetailsCard>;

const baseTicket: TicketDetails = {
	id: "INC-1001",
	title: "Unable to access email after password reset",
	description:
		"User reports that after completing the password reset process, they are unable to log into their email account. The error message states 'Invalid credentials' even though the new password was just set.",
	priority: "medium",
	requester: "adams@acme.com",
	status: "Open",
	assignedTo: "IT Help Desk",
	createdAt: "2025-10-09T13:23:23.000Z",
};

export const Default: Story = {
	args: {
		ticket: baseTicket,
	},
};

export const LowPriority: Story = {
	args: {
		ticket: {
			...baseTicket,
			id: "INC-1002",
			title: "Request for additional monitor",
			description:
				"Employee requesting a second monitor for their workstation.",
			priority: "low",
		},
	},
};

export const HighPriority: Story = {
	args: {
		ticket: {
			...baseTicket,
			id: "INC-1003",
			title: "VPN connection failing for remote team",
			description:
				"Multiple team members reporting VPN connection failures. Unable to access internal resources. Affecting productivity.",
			priority: "high",
		},
	},
};

export const CriticalPriority: Story = {
	args: {
		ticket: {
			...baseTicket,
			id: "INC-1004",
			title: "Production database server down",
			description:
				"Production database is unreachable. All customer-facing applications are affected. Immediate action required.",
			priority: "critical",
			assignedTo: "Security Team",
		},
	},
};

export const UnsetPriority: Story = {
	args: {
		ticket: {
			...baseTicket,
			id: "INC-1006",
			title: "General inquiry about system access",
			description: "New employee asking about system access procedures.",
			priority: null,
		},
	},
};

export const Unassigned: Story = {
	args: {
		ticket: {
			...baseTicket,
			id: "INC-1007",
			title: "Wi-Fi not connecting in building 3",
			description: "Cannot connect to corporate Wi-Fi from the third floor.",
			assignedTo: null,
			requester: null,
		},
	},
};

export const LongDescription: Story = {
	args: {
		ticket: {
			...baseTicket,
			id: "INC-1005",
			title: "Complex integration issue with third-party API",
			description:
				"The integration with the payment gateway is experiencing intermittent failures. Error logs show timeout exceptions occurring approximately every 15 minutes. This appears to correlate with peak traffic times. The vendor has been contacted but has not yet provided a root cause analysis. In the meantime, we are implementing retry logic with exponential backoff.",
			priority: "high",
		},
	},
};
