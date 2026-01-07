import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
	component: Skeleton,
	title: "Components/Feedback/Skeleton",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
	args: {
		className: "h-4 w-[200px]",
	},
};

export const Card: Story = {
	render: () => (
		<div className="flex flex-col space-y-3">
			<Skeleton className="h-[125px] w-[250px] rounded-xl" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-[250px]" />
				<Skeleton className="h-4 w-[200px]" />
			</div>
		</div>
	),
};

export const Avatar: Story = {
	render: () => (
		<div className="flex items-center space-x-4">
			<Skeleton className="h-12 w-12 rounded-full" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-[150px]" />
				<Skeleton className="h-4 w-[100px]" />
			</div>
		</div>
	),
};

export const TextLines: Story = {
	render: () => (
		<div className="space-y-2 w-[300px]">
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-[80%]" />
		</div>
	),
};

export const Table: Story = {
	render: () => (
		<div className="space-y-3 w-[400px]">
			<div className="flex gap-4">
				<Skeleton className="h-8 w-[100px]" />
				<Skeleton className="h-8 w-[150px]" />
				<Skeleton className="h-8 w-[100px]" />
			</div>
			<div className="flex gap-4">
				<Skeleton className="h-6 w-[100px]" />
				<Skeleton className="h-6 w-[150px]" />
				<Skeleton className="h-6 w-[100px]" />
			</div>
			<div className="flex gap-4">
				<Skeleton className="h-6 w-[100px]" />
				<Skeleton className="h-6 w-[150px]" />
				<Skeleton className="h-6 w-[100px]" />
			</div>
		</div>
	),
};
