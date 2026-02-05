import {
	useInfiniteScroll,
	type UseInfiniteScrollOptions,
} from "@/hooks/useInfiniteScroll";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface InfiniteScrollContainerProps {
	children: React.ReactNode;
	/** Whether there are more items to load */
	hasMore: boolean;
	/** Whether currently loading more items */
	isLoading: boolean;
	/** Callback to load more items */
	onLoadMore: () => void;
	/** Custom loading component (default: Spinner) */
	loadingComponent?: React.ReactNode;
	/** Message to show when no more items */
	endMessage?: React.ReactNode;
	/** Additional class names for the container */
	className?: string;
	/** Root margin for intersection observer */
	rootMargin?: UseInfiniteScrollOptions["rootMargin"];
	/** Whether infinite scroll is enabled (default: true) */
	enabled?: boolean;
}

/**
 * Reusable infinite scroll container component
 * Wraps content and handles sentinel element + loading state
 */
export function InfiniteScrollContainer({
	children,
	hasMore,
	isLoading,
	onLoadMore,
	loadingComponent,
	endMessage,
	className,
	rootMargin = "100px",
	enabled = true,
}: InfiniteScrollContainerProps) {
	const { sentinelRef } = useInfiniteScroll({
		hasMore,
		isLoading,
		onLoadMore,
		rootMargin,
		enabled,
	});

	return (
		<div className={cn("flex flex-col", className)}>
			{children}

			{/* Sentinel element for intersection observer */}
			<div ref={sentinelRef} className="h-1" aria-hidden="true" />

			{/* Loading indicator */}
			{isLoading && (
				<div className="flex justify-center py-4">
					{loadingComponent ?? (
						<Spinner className="size-6 text-muted-foreground" />
					)}
				</div>
			)}

			{/* End message when no more items */}
			{!hasMore && !isLoading && endMessage && (
				<div className="flex justify-center py-4 text-sm text-muted-foreground">
					{endMessage}
				</div>
			)}
		</div>
	);
}
