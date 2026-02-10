import { useTranslation } from "react-i18next";
import { ConversationListItem } from "@/components/sidebar/ConversationListItem";
import { InfiniteScrollContainer } from "@/components/ui/infinite-scroll-container";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation } from "@/stores/conversationStore";

export interface ConversationListProps {
	conversations: Conversation[];
	isLoading: boolean;
	isFetchingNextPage: boolean;
	hasNextPage: boolean;
	onLoadMore: () => void;
	currentConversationId: string | null;
	onConversationClick: (conversationId: string) => void;
}

export function ConversationList({
	conversations,
	isLoading,
	isFetchingNextPage,
	hasNextPage,
	onLoadMore,
	currentConversationId,
	onConversationClick,
}: ConversationListProps) {
	const { t } = useTranslation();

	return (
		<SidebarGroup>
			<SidebarGroupLabel className="px-2 h-8 rounded-md text-xs text-sidebar-foreground">
				{t("nav.recentChats")}
			</SidebarGroupLabel>
			<SidebarMenu className="gap-1">
				{isLoading ? (
					<div className="space-y-1 px-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-8 w-full rounded-md" />
						))}
					</div>
				) : conversations.length === 0 ? (
					<div className="px-2 text-xs text-muted-foreground">
						{t("nav.noConversations")}
					</div>
				) : (
					<InfiniteScrollContainer
						hasMore={hasNextPage}
						isLoading={isFetchingNextPage}
						onLoadMore={onLoadMore}
						rootMargin="50px"
					>
						{conversations.map((conversation) => (
							<ConversationListItem
								key={conversation.id}
								conversation={conversation}
								isActive={conversation.id === currentConversationId}
								onClick={onConversationClick}
							/>
						))}
					</InfiniteScrollContainer>
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
}
