import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { Conversation } from "@/stores/conversationStore";
import { ConversationList } from "./ConversationList";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

const sampleConversations: Conversation[] = [
	{
		id: "conv-1",
		title: "Password Reset Help",
		created_at: new Date("2025-01-15T10:00:00Z"),
		updated_at: new Date("2025-01-15T14:30:00Z"),
	},
	{
		id: "conv-2",
		title: "What is a hash table?",
		created_at: new Date("2025-01-14T09:00:00Z"),
		updated_at: new Date("2025-01-14T11:00:00Z"),
	},
	{
		id: "conv-3",
		title: "Can you explain what FAQ questions we have about the product?",
		created_at: new Date("2025-01-13T08:00:00Z"),
		updated_at: new Date("2025-01-13T16:00:00Z"),
	},
	{
		id: "conv-4",
		title: "Tell me something about Guadalajara",
		created_at: new Date("2025-01-12T10:00:00Z"),
		updated_at: new Date("2025-01-12T12:00:00Z"),
	},
	{
		id: "conv-5",
		title: "Can you explain me the Enokama Free Pass",
		created_at: new Date("2025-01-11T07:00:00Z"),
		updated_at: new Date("2025-01-11T09:00:00Z"),
	},
	{
		id: "conv-6",
		title: "Citations",
		created_at: new Date("2025-01-10T14:00:00Z"),
		updated_at: new Date("2025-01-10T15:00:00Z"),
	},
	{
		id: "conv-7",
		title: "Can you give me dumpling dough recipe?",
		created_at: new Date("2025-01-09T11:00:00Z"),
		updated_at: new Date("2025-01-09T13:00:00Z"),
	},
];

const meta: Meta<typeof ConversationList> = {
	component: ConversationList,
	title: "Components/Sidebar/ConversationList",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Sidebar conversation list with infinite scroll. Displays recent chats with loading, empty, and paginated states.",
			},
		},
	},
	args: {
		conversations: sampleConversations,
		isLoading: false,
		isFetchingNextPage: false,
		hasNextPage: true,
		onLoadMore: fn(),
		currentConversationId: null,
		onConversationClick: fn(),
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<SidebarProvider defaultOpen>
					<div className="w-[240px] h-[500px] overflow-auto bg-sidebar rounded-lg border">
						<Story />
					</div>
				</SidebarProvider>
			</QueryClientProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ConversationList>;

export const Default: Story = {};

export const WithActiveConversation: Story = {
	args: {
		currentConversationId: "conv-2",
	},
};

export const Loading: Story = {
	args: {
		conversations: [],
		isLoading: true,
	},
};

export const Empty: Story = {
	args: {
		conversations: [],
		isLoading: false,
		hasNextPage: false,
	},
};

export const LoadingMore: Story = {
	args: {
		isFetchingNextPage: true,
		hasNextPage: true,
	},
};

export const AllLoaded: Story = {
	args: {
		hasNextPage: false,
	},
};
