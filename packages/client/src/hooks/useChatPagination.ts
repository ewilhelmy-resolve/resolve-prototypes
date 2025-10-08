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
  hasPaginationAttempted: boolean
}

export function useChatPagination({
  conversationId,
  scrollContainerRef,
  enabled = true,
  threshold = 200,
}: UseChatPaginationProps): UseChatPaginationReturn {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { chatMessages, setMessages, prependMessages, setHasMoreMessages, setLoadingMore } = useConversationStore()
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [hasPaginationAttempted, setHasPaginationAttempted] = useState(false)
  const scrollAttemptedRef = useRef<string | null>(null)
  const previousPageCountRef = useRef(0)

  // Use infinite query hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteConversationMessages(conversationId)

  // Preserve scroll position before loading
  const scrollHeightBeforeLoad = useRef<number>(0)
  const scrollTopBeforeLoad = useRef<number>(0)

  // Update store when query data changes
  useEffect(() => {
    if (!data) return

    const allMessages = data.pages.flatMap((page) => page.messages)
    const hasMore = data.pages[data.pages.length - 1]?.hasMore || false
    const currentPageCount = data.pages.length

    // Initial load: replace all messages
    if (currentPageCount === 1 && previousPageCountRef.current === 0) {
      setMessages(allMessages)
      previousPageCountRef.current = 1
    }
    // Pagination: prepend older messages
    else if (currentPageCount > previousPageCountRef.current) {
      const latestPage = data.pages[data.pages.length - 1]
      if (latestPage.messages.length > 0) {
        prependMessages(latestPage.messages)
      }
      previousPageCountRef.current = currentPageCount
      // Mark that pagination has been attempted (user scrolled to top)
      setHasPaginationAttempted(true)
    }

    setHasMoreMessages(hasMore)
  }, [data, setMessages, prependMessages, setHasMoreMessages])

  // Update loading state
  useEffect(() => {
    setLoadingMore(isFetchingNextPage)
  }, [isFetchingNextPage, setLoadingMore])

  // Reset page count when conversation changes
  useEffect(() => {
    if (conversationId) {
      previousPageCountRef.current = 0
    }
  }, [conversationId])

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

  // Reset scroll state when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setHasScrolledToBottom(false)
      setHasPaginationAttempted(false)
      scrollAttemptedRef.current = null
    }
  }, [conversationId])

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (!scrollContainerRef.current || !conversationId || !chatMessages.length) {
      return
    }

    // Skip if we've already scrolled for this conversation
    if (scrollAttemptedRef.current === conversationId) {
      return
    }

    const container = scrollContainerRef.current

    // Only auto-scroll to bottom once when conversation first loads and has content
    if (container.scrollHeight > container.clientHeight) {
      // Use setTimeout to ensure DOM has fully rendered
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
          setHasScrolledToBottom(true)
          scrollAttemptedRef.current = conversationId
        }
      }, 150) // Slightly longer delay to ensure content is rendered
    }
  }, [conversationId, chatMessages.length, scrollContainerRef])

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

        // Detect when user scrolls to top (sentinel becomes visible)
        if (entry.isIntersecting) {
          const scrollTop = container.scrollTop

          // Only trigger if we're within threshold pixels from top
          if (scrollTop < threshold) {
            // Mark that user attempted to view older messages (scrolled to top)
            setHasPaginationAttempted(true)

            // Only load more if there are actually more messages to load
            if (hasNextPage && !isFetchingNextPage) {
              loadMore()
            }
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
    hasPaginationAttempted,
  }
}
