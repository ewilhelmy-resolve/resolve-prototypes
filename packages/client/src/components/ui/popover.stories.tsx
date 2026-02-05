import type { Meta, StoryObj } from "@storybook/react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { Button } from "./button";
import { Label } from "./label";
import { Input } from "./input";

const meta: Meta<typeof Popover> = {
	component: Popover,
	title: "Components/Overlays/Popover",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Open Popover</Button>
			</PopoverTrigger>
			<PopoverContent>
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Dimensions</h4>
						<p className="text-sm text-muted-foreground">
							Set the dimensions for the layer.
						</p>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const WithForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Edit Dimensions</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Dimensions</h4>
						<p className="text-sm text-muted-foreground">
							Set the dimensions for the layer.
						</p>
					</div>
					<div className="grid gap-2">
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="width">Width</Label>
							<Input id="width" defaultValue="100%" className="col-span-2 h-8" />
						</div>
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="maxWidth">Max. width</Label>
							<Input id="maxWidth" defaultValue="300px" className="col-span-2 h-8" />
						</div>
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="height">Height</Label>
							<Input id="height" defaultValue="25px" className="col-span-2 h-8" />
						</div>
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="maxHeight">Max. height</Label>
							<Input id="maxHeight" defaultValue="none" className="col-span-2 h-8" />
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const Positions: Story = {
	render: () => (
		<div className="flex gap-4">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Top</Button>
				</PopoverTrigger>
				<PopoverContent side="top">
					<p className="text-sm">This popover appears on top.</p>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Bottom</Button>
				</PopoverTrigger>
				<PopoverContent side="bottom">
					<p className="text-sm">This popover appears on bottom.</p>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Left</Button>
				</PopoverTrigger>
				<PopoverContent side="left">
					<p className="text-sm">This popover appears on left.</p>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Right</Button>
				</PopoverTrigger>
				<PopoverContent side="right">
					<p className="text-sm">This popover appears on right.</p>
				</PopoverContent>
			</Popover>
		</div>
	),
};
