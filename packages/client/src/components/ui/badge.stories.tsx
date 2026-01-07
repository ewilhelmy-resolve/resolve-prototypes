import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";

const meta: Meta<typeof Badge> = {
	component: Badge,
	title: "Components/Data Display/Badge",
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "destructive", "outline"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
	args: {
		children: "Badge",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Destructive",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline",
	},
};

export const WithIcon: Story = {
	args: {
		children: (
			<>
				<CheckCircle />
				Success
			</>
		),
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	),
};

export const WithIcons: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge>
				<CheckCircle />
				Success
			</Badge>
			<Badge variant="destructive">
				<AlertTriangle />
				Error
			</Badge>
			<Badge variant="secondary">
				<Info />
				Info
			</Badge>
		</div>
	),
};

export const UseCases: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<span className="text-sm">Status:</span>
				<Badge>Active</Badge>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm">Role:</span>
				<Badge variant="secondary">Admin</Badge>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm">Alert:</span>
				<Badge variant="destructive">Overdue</Badge>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm">Count:</span>
				<Badge variant="outline">12 items</Badge>
			</div>
		</div>
	),
};
