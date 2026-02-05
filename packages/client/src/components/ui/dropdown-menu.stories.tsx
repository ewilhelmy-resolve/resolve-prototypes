import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
} from "./dropdown-menu";
import { Button } from "./button";
import { User, Settings, LogOut, Mail, MessageSquare, PlusCircle, Cloud, CreditCard, Keyboard } from "lucide-react";

const meta: Meta<typeof DropdownMenu> = {
	component: DropdownMenu,
	title: "Components/Actions/Dropdown Menu",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Open Menu</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<User className="mr-2 h-4 w-4" />
					Profile
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Settings className="mr-2 h-4 w-4" />
					Settings
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithShortcuts: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Open Menu</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<User className="mr-2 h-4 w-4" />
					Profile
					<DropdownMenuShortcut>Shift+Cmd+P</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<CreditCard className="mr-2 h-4 w-4" />
					Billing
					<DropdownMenuShortcut>Cmd+B</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Settings className="mr-2 h-4 w-4" />
					Settings
					<DropdownMenuShortcut>Cmd+S</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Keyboard className="mr-2 h-4 w-4" />
					Keyboard shortcuts
					<DropdownMenuShortcut>?</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithCheckboxItems: Story = {
	render: function Render() {
		const [showStatusBar, setShowStatusBar] = useState(true);
		const [showActivityBar, setShowActivityBar] = useState(false);
		const [showPanel, setShowPanel] = useState(false);

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline">View Options</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56">
					<DropdownMenuLabel>Appearance</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuCheckboxItem
						checked={showStatusBar}
						onCheckedChange={setShowStatusBar}
					>
						Status Bar
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={showActivityBar}
						onCheckedChange={setShowActivityBar}
					>
						Activity Bar
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={showPanel}
						onCheckedChange={setShowPanel}
					>
						Panel
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
};

export const WithRadioItems: Story = {
	render: function Render() {
		const [position, setPosition] = useState("bottom");

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline">Panel Position</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56">
					<DropdownMenuLabel>Panel Position</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
						<DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
};

export const WithSubmenu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Open Menu</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<User className="mr-2 h-4 w-4" />
					Profile
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Mail className="mr-2 h-4 w-4" />
						Invite users
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>
							<Mail className="mr-2 h-4 w-4" />
							Email
						</DropdownMenuItem>
						<DropdownMenuItem>
							<MessageSquare className="mr-2 h-4 w-4" />
							Message
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<PlusCircle className="mr-2 h-4 w-4" />
							More...
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Cloud className="mr-2 h-4 w-4" />
					API
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};
