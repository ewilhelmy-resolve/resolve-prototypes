import type { Meta, StoryObj } from "@storybook/react";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { STATUS } from "@/constants/connectionSources";

const meta: Meta<typeof ConnectionStatusBadge> = {
	component: ConnectionStatusBadge,
	title: "Features/Connections/Status Badge",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof ConnectionStatusBadge>;

export const Verifying: Story = {
	args: {
		status: STATUS.VERIFYING,
	},
};

export const Syncing: Story = {
	args: {
		status: STATUS.SYNCING,
	},
};

export const Connected: Story = {
	args: {
		status: STATUS.CONNECTED,
	},
};

export const ErrorStatus: Story = {
	args: {
		status: STATUS.ERROR,
	},
};

export const Cancelled: Story = {
	args: {
		status: STATUS.CANCELLED,
	},
};

export const NotConnected: Story = {
	args: {
		status: STATUS.NOT_CONNECTED,
	},
};

export const Retrying: Story = {
	args: {
		status: STATUS.ERROR,
		isRetrying: true,
	},
};

export const NeedHelp: Story = {
	args: {
		status: STATUS.ERROR,
		showHelp: true,
	},
};

export const AllStatuses: Story = {
	render: () => (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Verifying</span>
				<ConnectionStatusBadge status={STATUS.VERIFYING} />
			</div>
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Syncing</span>
				<ConnectionStatusBadge status={STATUS.SYNCING} />
			</div>
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Connected</span>
				<ConnectionStatusBadge status={STATUS.CONNECTED} />
			</div>
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Error</span>
				<ConnectionStatusBadge status={STATUS.ERROR} />
			</div>
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Cancelled</span>
				<ConnectionStatusBadge status={STATUS.CANCELLED} />
			</div>
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Not connected</span>
				<ConnectionStatusBadge status={STATUS.NOT_CONNECTED} />
			</div>
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Retrying</span>
				<ConnectionStatusBadge status={STATUS.ERROR} isRetrying />
			</div>
			<div className="flex items-center gap-4">
				<span className="text-sm text-muted-foreground w-28">Need Help</span>
				<ConnectionStatusBadge status={STATUS.ERROR} showHelp />
			</div>
		</div>
	),
};
