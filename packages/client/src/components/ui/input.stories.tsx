import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";
import { Button } from "./button";
import { Search as SearchIcon, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const meta: Meta<typeof Input> = {
	component: Input,
	title: "Components/Forms/Input",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
	args: {
		placeholder: "Enter text...",
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-2">
			<Label htmlFor="email">Email</Label>
			<Input id="email" type="email" placeholder="you@example.com" />
		</div>
	),
};

export const Password: Story = {
	args: {
		type: "password",
		placeholder: "Enter password",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: "Disabled input",
		value: "Cannot edit this",
	},
};

export const WithDefaultValue: Story = {
	args: {
		defaultValue: "Default value",
	},
};

export const File: Story = {
	args: {
		type: "file",
	},
};

export const SearchInput: Story = {
	render: () => (
		<div className="relative">
			<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input placeholder="Search..." className="pl-9" />
		</div>
	),
};

export const WithButton: Story = {
	render: () => (
		<div className="flex gap-2">
			<Input type="email" placeholder="Enter your email" />
			<Button>Subscribe</Button>
		</div>
	),
};

export const Invalid: Story = {
	render: () => (
		<div className="grid gap-2">
			<Label htmlFor="email-invalid">Email</Label>
			<Input
				id="email-invalid"
				type="email"
				placeholder="you@example.com"
				aria-invalid="true"
				defaultValue="invalid-email"
			/>
			<p className="text-sm text-destructive">Please enter a valid email address</p>
		</div>
	),
};

export const PasswordToggle: Story = {
	render: function PasswordToggleStory() {
		const [showPassword, setShowPassword] = useState(false);
		return (
			<div className="grid gap-2">
				<Label htmlFor="password">Password</Label>
				<div className="relative">
					<Input
						id="password"
						type={showPassword ? "text" : "password"}
						placeholder="Enter password"
						className="pr-10"
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
					</button>
				</div>
			</div>
		);
	},
};

