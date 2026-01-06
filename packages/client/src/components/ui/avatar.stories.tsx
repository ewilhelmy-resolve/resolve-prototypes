import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

const meta: Meta<typeof Avatar> = {
	component: Avatar,
	title: "Components/Data Display/Avatar",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
	render: () => (
		<Avatar>
			<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
			<AvatarFallback>CN</AvatarFallback>
		</Avatar>
	),
};

export const WithFallback: Story = {
	render: () => (
		<Avatar>
			<AvatarImage src="/broken-image.jpg" alt="User" />
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	),
};

export const FallbackOnly: Story = {
	render: () => (
		<Avatar>
			<AvatarFallback>AB</AvatarFallback>
		</Avatar>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Avatar className="h-6 w-6">
				<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
				<AvatarFallback className="text-xs">CN</AvatarFallback>
			</Avatar>
			<Avatar className="h-8 w-8">
				<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
				<AvatarFallback>CN</AvatarFallback>
			</Avatar>
			<Avatar className="h-12 w-12">
				<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
				<AvatarFallback>CN</AvatarFallback>
			</Avatar>
			<Avatar className="h-16 w-16">
				<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
				<AvatarFallback className="text-lg">CN</AvatarFallback>
			</Avatar>
		</div>
	),
};

export const Group: Story = {
	render: () => (
		<div className="flex -space-x-4">
			<Avatar className="border-2 border-background">
				<AvatarFallback>AB</AvatarFallback>
			</Avatar>
			<Avatar className="border-2 border-background">
				<AvatarFallback>CD</AvatarFallback>
			</Avatar>
			<Avatar className="border-2 border-background">
				<AvatarFallback>EF</AvatarFallback>
			</Avatar>
			<Avatar className="border-2 border-background">
				<AvatarFallback>+3</AvatarFallback>
			</Avatar>
		</div>
	),
};
