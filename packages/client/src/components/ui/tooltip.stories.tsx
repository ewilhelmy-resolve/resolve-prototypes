import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Button } from "./button";
import { Info, HelpCircle, Settings, Plus } from "lucide-react";

const meta: Meta<typeof Tooltip> = {
	component: Tooltip,
	title: "Components/Overlays/Tooltip",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>This is a tooltip</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const OnIcon: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon">
					<Info className="h-4 w-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>More information</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const Top: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Top</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<p>Tooltip on top</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const Right: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Right</Button>
			</TooltipTrigger>
			<TooltipContent side="right">
				<p>Tooltip on right</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const Bottom: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Bottom</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p>Tooltip on bottom</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const Left: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Left</Button>
			</TooltipTrigger>
			<TooltipContent side="left">
				<p>Tooltip on left</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const LongContent: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon">
					<HelpCircle className="h-4 w-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent className="max-w-xs">
				<p>
					This is a longer tooltip that contains more detailed information about
					the feature or element being described.
				</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const AllPositions: Story = {
	render: () => (
		<div className="flex gap-8 items-center">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="sm">
						Top
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">Top tooltip</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="sm">
						Right
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right">Right tooltip</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="sm">
						Bottom
					</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom">Bottom tooltip</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="sm">
						Left
					</Button>
				</TooltipTrigger>
				<TooltipContent side="left">Left tooltip</TooltipContent>
			</Tooltip>
		</div>
	),
};

export const IconButtons: Story = {
	render: () => (
		<div className="flex gap-2">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon">
						<Plus className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Add new item</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon">
						<Settings className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Settings</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon">
						<HelpCircle className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Get help</TooltipContent>
			</Tooltip>
		</div>
	),
};
