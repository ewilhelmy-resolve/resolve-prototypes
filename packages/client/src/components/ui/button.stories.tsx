import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Button } from "./button";
import { Mail, Loader2, ChevronRight, Plus, Download, Trash2 } from "lucide-react";

const meta: Meta<typeof Button> = {
	component: Button,
	title: "Components/Actions/Button",
	tags: ["autodocs"],
	args: {
		onClick: fn(),
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
		},
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
	args: {
		children: "Button",
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

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Ghost",
	},
};

export const Link: Story = {
	args: {
		variant: "link",
		children: "Link",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: "Small",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large",
	},
};

export const Icon: Story = {
	args: {
		variant: "outline",
		size: "icon",
		children: <Mail className="h-4 w-4" />,
	},
};

export const WithIcon: Story = {
	args: {
		children: (
			<>
				<Mail className="h-4 w-4" />
				Login with Email
			</>
		),
	},
};

export const Loading: Story = {
	args: {
		disabled: true,
		children: (
			<>
				<Loader2 className="h-4 w-4 animate-spin" />
				Please wait
			</>
		),
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		children: "Disabled",
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-4">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon">
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	),
};

export const CommonUseCases: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex gap-2">
				<Button>
					<Plus className="h-4 w-4" />
					Add Item
				</Button>
				<Button variant="outline">
					<Download className="h-4 w-4" />
					Export
				</Button>
				<Button variant="destructive">
					<Trash2 className="h-4 w-4" />
					Delete
				</Button>
			</div>
			<div className="flex gap-2">
				<Button variant="outline">Cancel</Button>
				<Button>
					Save Changes
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
			<div className="flex gap-2">
				<Button disabled>
					<Loader2 className="h-4 w-4 animate-spin" />
					Saving...
				</Button>
			</div>
		</div>
	),
};
