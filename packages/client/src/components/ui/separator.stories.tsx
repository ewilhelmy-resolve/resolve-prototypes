import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./separator";

const meta: Meta<typeof Separator> = {
	component: Separator,
	title: "Components/Layout/Separator",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		orientation: {
			control: "select",
			options: ["horizontal", "vertical"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
	render: () => (
		<div className="w-[300px]">
			<div className="space-y-1">
				<h4 className="text-sm font-medium leading-none">Radix Primitives</h4>
				<p className="text-sm text-muted-foreground">
					An open-source UI component library.
				</p>
			</div>
			<Separator className="my-4" />
			<div className="flex h-5 items-center space-x-4 text-sm">
				<div>Blog</div>
				<Separator orientation="vertical" />
				<div>Docs</div>
				<Separator orientation="vertical" />
				<div>Source</div>
			</div>
		</div>
	),
};

export const Vertical: Story = {
	render: () => (
		<div className="flex h-[50px] items-center space-x-4 text-sm">
			<div>Home</div>
			<Separator orientation="vertical" />
			<div>About</div>
			<Separator orientation="vertical" />
			<div>Contact</div>
		</div>
	),
};

export const InList: Story = {
	render: () => (
		<div className="w-[300px]">
			<div className="py-2">
				<p className="text-sm">First Item</p>
			</div>
			<Separator />
			<div className="py-2">
				<p className="text-sm">Second Item</p>
			</div>
			<Separator />
			<div className="py-2">
				<p className="text-sm">Third Item</p>
			</div>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="w-[300px]">
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<Separator className="w-full" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background px-2 text-muted-foreground">
						Or continue with
					</span>
				</div>
			</div>
		</div>
	),
};
