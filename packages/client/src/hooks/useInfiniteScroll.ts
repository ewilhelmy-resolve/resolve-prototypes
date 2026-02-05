import { type UseInViewOptions, useInView } from "motion/react";
import { useEffect, useRef } from "react";

export interface UseInfiniteScrollOptions {
	/** Whether there are more items to load */
	hasMore: boolean;
	/** Whether currently loading more items */
	isLoading: boolean;
	/** Callback to load more items */
	onLoadMore: () => void;
	/** Root margin for intersection observer (default: "100px") */
	rootMargin?: UseInViewOptions["margin"];
	/** Whether the hook is enabled (default: true) */
	enabled?: boolean;
}

export interface UseInfiniteScrollReturn {
	/** Ref to attach to sentinel element at bottom of scroll container */
	sentinelRef: React.RefObject<HTMLDivElement>;
}

/**
 * Reusable infinite scroll hook using IntersectionObserver
 * Place the sentinelRef at the bottom of your scroll container
 * to auto-trigger loading when user scrolls near the end
 */
export function useInfiniteScroll({
	hasMore,
	isLoading,
	onLoadMore,
	rootMargin = "100px",
	enabled = true,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const isInView = useInView(sentinelRef, { margin: rootMargin });

	// Load more when sentinel becomes visible
	useEffect(() => {
		if (enabled && isInView && hasMore && !isLoading) {
			onLoadMore();
		}
	}, [enabled, isInView, hasMore, isLoading, onLoadMore]);

	return { sentinelRef };
}
