import type { Meta, StoryObj } from "@storybook/react";
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "./sheet";
import { Button } from "./button";
import { Label } from "./label";
import { Input } from "./input";

const meta: Meta<typeof Sheet> = {
	component: Sheet,
	title: "Components/Overlays/Sheet",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">Open Sheet</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Edit Profile</SheetTitle>
					<SheetDescription>
						Make changes to your profile here. Click save when you're done.
					</SheetDescription>
				</SheetHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="name" className="text-right">
							Name
						</Label>
						<Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="username" className="text-right">
							Username
						</Label>
						<Input id="username" defaultValue="@peduarte" className="col-span-3" />
					</div>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const Left: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">Open Left Sheet</Button>
			</SheetTrigger>
			<SheetContent side="left">
				<SheetHeader>
					<SheetTitle>Navigation</SheetTitle>
					<SheetDescription>
						Browse through the application sections.
					</SheetDescription>
				</SheetHeader>
				<div className="grid gap-4 py-4">
					<Button variant="ghost" className="justify-start">
						Dashboard
					</Button>
					<Button variant="ghost" className="justify-start">
						Settings
					</Button>
					<Button variant="ghost" className="justify-start">
						Profile
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const Top: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">Open Top Sheet</Button>
			</SheetTrigger>
			<SheetContent side="top">
				<SheetHeader>
					<SheetTitle>Notification</SheetTitle>
					<SheetDescription>
						You have new updates available for your account.
					</SheetDescription>
				</SheetHeader>
			</SheetContent>
		</Sheet>
	),
};

export const Bottom: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">Open Bottom Sheet</Button>
			</SheetTrigger>
			<SheetContent side="bottom">
				<SheetHeader>
					<SheetTitle>Cookie Preferences</SheetTitle>
					<SheetDescription>
						Manage your cookie settings. You can enable or disable different types of
						cookies below.
					</SheetDescription>
				</SheetHeader>
				<div className="flex gap-2 py-4">
					<Button variant="outline">Decline All</Button>
					<Button>Accept All</Button>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const AllSides: Story = {
	render: () => (
		<div className="flex gap-4">
			<Sheet>
				<SheetTrigger asChild>
					<Button variant="outline">Top</Button>
				</SheetTrigger>
				<SheetContent side="top">
					<SheetHeader>
						<SheetTitle>Top Sheet</SheetTitle>
						<SheetDescription>This sheet slides in from the top.</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant="outline">Right</Button>
				</SheetTrigger>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>Right Sheet</SheetTitle>
						<SheetDescription>This sheet slides in from the right.</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant="outline">Bottom</Button>
				</SheetTrigger>
				<SheetContent side="bottom">
					<SheetHeader>
						<SheetTitle>Bottom Sheet</SheetTitle>
						<SheetDescription>This sheet slides in from the bottom.</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant="outline">Left</Button>
				</SheetTrigger>
				<SheetContent side="left">
					<SheetHeader>
						<SheetTitle>Left Sheet</SheetTitle>
						<SheetDescription>This sheet slides in from the left.</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>
		</div>
	),
};
