import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Dialog> = {
	component: Dialog,
	title: "Components/Overlays/Dialog",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			story: {
				inline: false,
				iframeHeight: 400,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
	args: {
		open: true,
	},
	render: (args) => (
		<Dialog {...args}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Dialog Title</DialogTitle>
					<DialogDescription>
						This is a description of the dialog content.
					</DialogDescription>
				</DialogHeader>
				<p>Dialog body content goes here.</p>
			</DialogContent>
		</Dialog>
	),
};

export const WithTrigger: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Open Dialog</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Are you sure?</DialogTitle>
					<DialogDescription>
						This action cannot be undone. This will permanently delete your account.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button variant="destructive">Delete</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const FormDialog: Story = {
	args: {
		open: true,
	},
	render: (args) => (
		<Dialog {...args}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
					<DialogDescription>
						Make changes to your profile here. Click save when done.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input id="name" defaultValue="John Doe" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" defaultValue="john@example.com" />
					</div>
				</div>
				<DialogFooter>
					<Button type="submit">Save changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const WithoutCloseButton: Story = {
	args: {
		open: true,
	},
	render: (args) => (
		<Dialog {...args}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>No Close Button</DialogTitle>
					<DialogDescription>
						This dialog has no X button. Use the buttons below to close.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button>Confirm</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const Confirmation: Story = {
	args: {
		open: true,
	},
	render: (args) => (
		<Dialog {...args}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Item</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this item? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button variant="destructive" onClick={fn()}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const LongContent: Story = {
	args: {
		open: true,
	},
	render: (args) => (
		<Dialog {...args}>
			<DialogContent className="max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Terms of Service</DialogTitle>
					<DialogDescription>Please read our terms carefully.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 text-sm">
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
						tempor incididunt ut labore et dolore magna aliqua.
					</p>
					<p>
						Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
						aliquip ex ea commodo consequat.
					</p>
					<p>
						Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
						dolore eu fugiat nulla pariatur.
					</p>
					<p>
						Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
						deserunt mollit anim id est laborum.
					</p>
					<p>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
						tempor incididunt ut labore et dolore magna aliqua.
					</p>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Decline</Button>
					</DialogClose>
					<Button>Accept</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};
