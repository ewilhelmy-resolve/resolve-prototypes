import type { Meta, StoryObj } from "@storybook/react";
import TicketDetailsCard from "./TicketDetailsCard";
import type { TicketDetails } from "./TicketDetailsCard";

const meta: Meta<typeof TicketDetailsCard> = {
	component: TicketDetailsCard,
	title: "Features/Tickets/Ticket Details Card",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Card component displaying ticket details with priority badge, ID, title, and description.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="w-96">
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
			description: "Employee requesting a second monitor for their workstation.",
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
