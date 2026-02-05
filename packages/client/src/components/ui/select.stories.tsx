import type { Meta, StoryObj } from "@storybook/react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./select";
import { Label } from "./label";
 
const meta: Meta<typeof Select> = {
	component: Select,
	title: "Components/Forms/Select",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<div className="w-64">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
	render: () => (
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="cherry">Cherry</SelectItem>
				<SelectItem value="grape">Grape</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-2">
			<Label htmlFor="fruit">Favorite Fruit</Label>
			<Select>
				<SelectTrigger id="fruit">
					<SelectValue placeholder="Select a fruit" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="apple">Apple</SelectItem>
					<SelectItem value="banana">Banana</SelectItem>
					<SelectItem value="cherry">Cherry</SelectItem>
					<SelectItem value="grape">Grape</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};

export const WithGroups: Story = {
	render: () => (
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Select a timezone" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>North America</SelectLabel>
					<SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
					<SelectItem value="cst">Central Standard Time (CST)</SelectItem>
					<SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
					<SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Europe</SelectLabel>
					<SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
					<SelectItem value="cet">Central European Time (CET)</SelectItem>
					<SelectItem value="eet">Eastern European Time (EET)</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Small: Story = {
	render: () => (
		<Select>
			<SelectTrigger size="sm">
				<SelectValue placeholder="Small select" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="option1">Option 1</SelectItem>
				<SelectItem value="option2">Option 2</SelectItem>
				<SelectItem value="option3">Option 3</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	render: () => (
		<Select disabled>
			<SelectTrigger>
				<SelectValue placeholder="Disabled select" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="option1">Option 1</SelectItem>
				<SelectItem value="option2">Option 2</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithDisabledItem: Story = {
	render: () => (
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Select an option" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="option1">Option 1</SelectItem>
				<SelectItem value="option2" disabled>
					Option 2 (Disabled)
				</SelectItem>
				<SelectItem value="option3">Option 3</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithDefaultValue: Story = {
	render: () => (
		<Select defaultValue="banana">
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="cherry">Cherry</SelectItem>
			</SelectContent>
		</Select>
	),
};

