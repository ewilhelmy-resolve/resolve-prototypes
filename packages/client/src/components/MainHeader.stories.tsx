import type { Meta, StoryObj } from "@storybook/react";
import { MainHeader } from "./MainHeader";
import { StatGroup } from "./StatGroup";
import { StatCard } from "./StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Upload, Link, Loader } from "lucide-react";

const meta: Meta<typeof MainHeader> = {
	component: MainHeader,
	title: "Features/Layout/Main Header",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof MainHeader>;

export const TitleOnly: Story = {
	args: {
		title: "Knowledge Articles",
	},
};

export const WithDescription: Story = {
	args: {
		title: "Knowledge Articles",
		description: "Manage your knowledge base and documentation",
	},
};

export const WithAction: Story = {
	args: {
		title: "Knowledge Articles",
		description: "Manage your knowledge base and documentation",
		action: <Button>Add Article</Button>,
	},
};

export const WithDropdownAction: Story = {
	args: {
		title: "Knowledge Articles",
		description: "Add files or connect external sources",
		action: (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button className="gap-2">
						<Plus className="h-4 w-4" />
						Add Articles
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem className="gap-2">
						<Upload className="h-4 w-4" />
						Upload file
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2">
						<Link className="h-4 w-4" />
						Connect source
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
};

export const WithStats: Story = {
	args: {
		title: "Knowledge Articles",
		description: "Manage your knowledge base and documentation",
		action: <Button>Add Article</Button>,
		stats: (
			<StatGroup>
				<StatCard value={42} label="Total Documents" />
				<StatCard
					value={10}
					label="Processing"
					badge={
						<Badge variant="secondary" className="gap-1">
							<Loader className="h-3 w-3 animate-spin" />
							Active
						</Badge>
					}
				/>
				<StatCard value={2} label="Failed" />
				<StatCard value={30} label="Completed" />
			</StatGroup>
		),
	},
};

export const FullExample: Story = {
	args: {
		title: "Team Members",
		description: "Manage user access and permissions for your organization",
		action: (
			<Button className="gap-2">
				<Plus className="h-4 w-4" />
				Invite User
			</Button>
		),
		stats: (
			<StatGroup>
				<StatCard value={24} label="Total Users" />
				<StatCard value={18} label="Active" />
				<StatCard value={3} label="Pending Invites" />
				<StatCard value={3} label="Admins" />
			</StatGroup>
		),
	},
};
