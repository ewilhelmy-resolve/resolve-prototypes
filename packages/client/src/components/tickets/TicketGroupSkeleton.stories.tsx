import type { Meta, StoryObj } from "@storybook/react";
import {
	TicketGroupSkeleton,
	TicketGroupSkeletonGrid,
} from "./TicketGroupSkeleton";

const meta: Meta<typeof TicketGroupSkeleton> = {
	component: TicketGroupSkeleton,
	title: "Features/Tickets/TicketGroupSkeleton",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof TicketGroupSkeleton>;

export const Default: Story = {
	render: () => (
		<div className="w-80">
			<TicketGroupSkeleton />
		</div>
	),
};

export const Grid: Story = {
	render: () => (
		<div className="w-[900px]">
			<TicketGroupSkeletonGrid count={6} />
		</div>
	),
};

export const GridSmall: Story = {
	render: () => (
		<div className="w-[900px]">
			<TicketGroupSkeletonGrid count={3} />
		</div>
	),
};
