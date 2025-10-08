/**
 * useChatPagination - Infinite scroll pagination hook for chat messages
 *
 * Handles:
 * - Intersection Observer for scroll-to-top detection
 * - Automatic "load more" trigger when scrolling to top
 * - Scroll position preservation after loading older messages
 * - Integration with TanStack Query infinite hook
 *
 * Usage:
 * ```typescript
 * const { sentinelRef, isLoadingMore } = useChatPagination({
 *   conversationId,
 *   scrollContainerRef,
 *   enabled: true
 * })
 *
 * // In JSX:
 * <div ref={scrollContainerRef}>
 *   <div ref={sentinelRef} /> {/* Top sentinel for Intersection Observer *\/}
 *   {messages.map(...)}
 * </div>
 * ```
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useInfiniteConversationMessages } from '@/hooks/api/useConversations'
import { useConversationStore } from '@/stores/conversationStore'

export interface UseChatPaginationProps {
  conversationId: string | null
  scrollContainerRef: React.RefObject<HTMLElement>
  enabled?: boolean
  threshold?: number // Distance from top to trigger load (in pixels)
}

export interface UseChatPaginationReturn {
  sentinelRef: React.RefObject<HTMLDivElement>
  isLoadingMore: boolean
  hasMore: boolean
}

export function useChatPagination({
  conversationId,
  scrollContainerRef,
  enabled = true,
  threshold = 200,
}: UseChatPaginationProps): UseChatPaginationReturn {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { isLoadingMore, hasMoreMessages } = useConversationStore()
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // Use infinite query hook
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteConversationMessages(conversationId)

  // Preserve scroll position before loading
  const scrollHeightBeforeLoad = useRef<number>(0)
  const scrollTopBeforeLoad = useRef<number>(0)

  // Handle loading older messages
  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || !scrollContainerRef.current) {
      return
    }

    const container = scrollContainerRef.current

    // Save scroll position before load
    scrollHeightBeforeLoad.current = container.scrollHeight
    scrollTopBeforeLoad.current = container.scrollTop

    // Trigger pagination
    await fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, scrollContainerRef])

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (!scrollContainerRef.current || !conversationId) {
      setHasScrolledToBottom(false)
      return
    }

    const container = scrollContainerRef.current

    // Only auto-scroll to bottom once when conversation first loads
    if (!hasScrolledToBottom && container.scrollHeight > 0) {
      // Use setTimeout to ensure DOM has rendered
      setTimeout(() => {
        container.scrollTop = container.scrollHeight
        setHasScrolledToBottom(true)
      }, 100) // Slightly longer delay to ensure content is rendered
    }
  }, [conversationId, hasScrolledToBottom, scrollContainerRef])

  // Preserve scroll position after load
  useEffect(() => {
    if (!isFetchingNextPage && scrollContainerRef.current && scrollHeightBeforeLoad.current > 0) {
      const container = scrollContainerRef.current
      const newScrollHeight = container.scrollHeight
      const heightDifference = newScrollHeight - scrollHeightBeforeLoad.current

      // Adjust scroll position to maintain user's view
      container.scrollTop = scrollTopBeforeLoad.current + heightDifference

      // Reset
      scrollHeightBeforeLoad.current = 0
      scrollTopBeforeLoad.current = 0
    }
  }, [isFetchingNextPage, scrollContainerRef])

  // Setup Intersection Observer for scroll-to-top detection
  useEffect(() => {
    // Don't activate observer until we've scrolled to bottom initially
    if (!enabled || !sentinelRef.current || !scrollContainerRef.current || !hasScrolledToBottom) {
      return
    }

    const sentinel = sentinelRef.current
    const container = scrollContainerRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        // Load more when sentinel becomes visible AND we're near the top
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          const scrollTop = container.scrollTop

          // Only trigger if we're within threshold pixels from top
          if (scrollTop < threshold) {
            loadMore()
          }
        }
      },
      {
        root: container,
        rootMargin: `${threshold}px 0px 0px 0px`, // Trigger slightly before reaching top
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [enabled, hasNextPage, isFetchingNextPage, loadMore, threshold, scrollContainerRef, hasScrolledToBottom])

  return {
    sentinelRef,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
  }
}
