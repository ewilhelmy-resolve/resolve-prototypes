import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { User, Settings, CreditCard } from "lucide-react";

const meta: Meta<typeof Tabs> = {
	component: Tabs,
	title: "Components/Layout/Tabs",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
	render: () => (
		<Tabs defaultValue="account" className="w-[400px]">
			<TabsList>
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
			</TabsList>
			<TabsContent value="account">
				<div className="p-4 rounded-lg border">
					<h3 className="font-medium">Account</h3>
					<p className="text-sm text-muted-foreground mt-2">
						Make changes to your account here. Click save when you're done.
					</p>
				</div>
			</TabsContent>
			<TabsContent value="password">
				<div className="p-4 rounded-lg border">
					<h3 className="font-medium">Password</h3>
					<p className="text-sm text-muted-foreground mt-2">
						Change your password here. After saving, you'll be logged out.
					</p>
				</div>
			</TabsContent>
		</Tabs>
	),
};

export const WithIcons: Story = {
	render: () => (
		<Tabs defaultValue="profile" className="w-[400px]">
			<TabsList>
				<TabsTrigger value="profile">
					<User className="h-4 w-4 mr-2" />
					Profile
				</TabsTrigger>
				<TabsTrigger value="settings">
					<Settings className="h-4 w-4 mr-2" />
					Settings
				</TabsTrigger>
				<TabsTrigger value="billing">
					<CreditCard className="h-4 w-4 mr-2" />
					Billing
				</TabsTrigger>
			</TabsList>
			<TabsContent value="profile">
				<div className="p-4 rounded-lg border">
					<h3 className="font-medium">Profile</h3>
					<p className="text-sm text-muted-foreground mt-2">
						Manage your profile information and preferences.
					</p>
				</div>
			</TabsContent>
			<TabsContent value="settings">
				<div className="p-4 rounded-lg border">
					<h3 className="font-medium">Settings</h3>
					<p className="text-sm text-muted-foreground mt-2">
						Configure application settings and integrations.
					</p>
				</div>
			</TabsContent>
			<TabsContent value="billing">
				<div className="p-4 rounded-lg border">
					<h3 className="font-medium">Billing</h3>
					<p className="text-sm text-muted-foreground mt-2">
						Manage your subscription and payment methods.
					</p>
				</div>
			</TabsContent>
		</Tabs>
	),
};

export const Disabled: Story = {
	render: () => (
		<Tabs defaultValue="account" className="w-[400px]">
			<TabsList>
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
				<TabsTrigger value="team" disabled>
					Team
				</TabsTrigger>
			</TabsList>
			<TabsContent value="account">
				<div className="p-4 rounded-lg border">
					<h3 className="font-medium">Account</h3>
					<p className="text-sm text-muted-foreground mt-2">
						Make changes to your account settings.
					</p>
				</div>
			</TabsContent>
			<TabsContent value="password">
				<div className="p-4 rounded-lg border">
					<h3 className="font-medium">Password</h3>
					<p className="text-sm text-muted-foreground mt-2">
						Update your password settings.
					</p>
				</div>
			</TabsContent>
		</Tabs>
	),
};
