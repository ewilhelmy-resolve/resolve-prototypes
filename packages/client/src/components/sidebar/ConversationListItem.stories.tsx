import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";
import { ConversationListItem } from "./ConversationListItem";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

const meta: Meta<typeof ConversationListItem> = {
	component: ConversationListItem,
	title: "Components/Sidebar/ConversationListItem",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"A sidebar conversation item with hover-revealed actions for rename and delete.",
			},
		},
	},
	args: {
		onClick: fn(),
		conversation: {
			id: "conv-1",
			title: "Password Reset Help",
			created_at: new Date("2025-01-15T10:00:00Z"),
			updated_at: new Date("2025-01-15T14:30:00Z"),
		},
		isActive: false,
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<SidebarProvider defaultOpen>
					<div className="w-[240px] bg-sidebar p-2">
						<SidebarMenu>
							<Story />
						</SidebarMenu>
					</div>
				</SidebarProvider>
			</QueryClientProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ConversationListItem>;

export const Default: Story = {};

export const Active: Story = {
	args: {
		isActive: true,
	},
};

export const LongTitle: Story = {
	args: {
		conversation: {
			id: "conv-2",
			title:
				"Can you explain what FAQ questions we have about the product and services?",
			created_at: new Date("2025-01-10T08:00:00Z"),
			updated_at: new Date("2025-01-14T16:00:00Z"),
		},
	},
};

export const ActiveLongTitle: Story = {
	args: {
		isActive: true,
		conversation: {
			id: "conv-3",
			title: "Me puedes explicar la inversion de tipo conservador y agresivo",
			created_at: new Date("2025-01-12T09:00:00Z"),
			updated_at: new Date("2025-01-13T11:00:00Z"),
		},
	},
};
