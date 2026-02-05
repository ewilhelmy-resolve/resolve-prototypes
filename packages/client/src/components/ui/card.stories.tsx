import type { Meta, StoryObj } from "@storybook/react";
import {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
} from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import { MoreVertical } from "lucide-react";

const meta: Meta<typeof Card> = {
	component: Card,
	title: "Components/Data Display/Card",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
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
type Story = StoryObj<typeof Card>;

export const Default: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card description goes here</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Card content goes here.</p>
			</CardContent>
		</Card>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<CardTitle>Create account</CardTitle>
				<CardDescription>Enter your email below to create your account</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" placeholder="m@example.com" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="password">Password</Label>
						<Input id="password" type="password" />
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex justify-between">
				<Button variant="outline">Cancel</Button>
				<Button>Create account</Button>
			</CardFooter>
		</Card>
	),
};

export const WithAction: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<CardTitle>Team Settings</CardTitle>
				<CardDescription>Manage your team preferences</CardDescription>
				<CardAction>
					<Button variant="ghost" size="icon">
						<MoreVertical className="h-4 w-4" />
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p>Configure your team settings and preferences here.</p>
			</CardContent>
		</Card>
	),
};

export const Simple: Story = {
	render: () => (
		<Card>
			<CardContent className="pt-6">
				<p>A simple card with just content and no header.</p>
			</CardContent>
		</Card>
	),
};

export const Stats: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<CardTitle>Total Revenue</CardTitle>
				<CardDescription>January - June 2024</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="text-3xl font-bold">$45,231.89</div>
				<p className="text-xs text-muted-foreground">+20.1% from last month</p>
			</CardContent>
		</Card>
	),
};

export const WithBadge: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<CardTitle>Project Alpha</CardTitle>
					<Badge variant="secondary">Active</Badge>
				</div>
				<CardDescription>Last updated 2 hours ago</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Project description and details go here.</p>
			</CardContent>
			<CardFooter>
				<Button className="w-full">View Project</Button>
			</CardFooter>
		</Card>
	),
};

export const NotificationCard: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<CardTitle>Notifications</CardTitle>
				<CardDescription>You have 3 unread messages.</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<div className="flex items-center gap-4 rounded-md border p-4">
					<div className="flex-1 space-y-1">
						<p className="text-sm font-medium">Push Notifications</p>
						<p className="text-sm text-muted-foreground">Send notifications to device.</p>
					</div>
				</div>
				<div className="flex items-center gap-4 rounded-md border p-4">
					<div className="flex-1 space-y-1">
						<p className="text-sm font-medium">Email Notifications</p>
						<p className="text-sm text-muted-foreground">Receive emails about activity.</p>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button className="w-full">Mark all as read</Button>
			</CardFooter>
		</Card>
	),
};
