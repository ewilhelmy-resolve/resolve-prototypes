/**
 * Infinite scroll pagination for chat messages.
 * Loads older messages when scrolling to top and preserves scroll position.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useInfiniteConversationMessages } from '@/hooks/api/useConversations'
import { useConversationStore } from '@/stores/conversationStore'

export interface UseChatPaginationProps {
  conversationId: string | null
  scrollContainerRef: React.RefObject<HTMLElement>
  enabled?: boolean
  threshold?: number
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
  const scrollPositionRef = useRef({ height: 0, top: 0 })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteConversationMessages(conversationId)

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
    if (!hasNextPage || isFetchingNextPage || !scrollContainerRef.current) return

    const container = scrollContainerRef.current
    scrollPositionRef.current = {
      height: container.scrollHeight,
      top: container.scrollTop
    }

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
    if (!scrollContainerRef.current || !conversationId || !chatMessages.length) return
    if (scrollAttemptedRef.current === conversationId) return // Already scrolled

    const container = scrollContainerRef.current

    if (container.scrollHeight > container.clientHeight) {
      // Tall conversation - scroll to bottom
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
          setHasScrolledToBottom(true)
          scrollAttemptedRef.current = conversationId
        }
      }, 150) // Wait for DOM rendering
    } else {
      // Short conversation - activate observer immediately
      setHasScrolledToBottom(true)
      scrollAttemptedRef.current = conversationId
    }
  }, [conversationId, chatMessages.length, scrollContainerRef])

  // Preserve scroll position after loading older messages
  useEffect(() => {
    if (!isFetchingNextPage && scrollContainerRef.current && scrollPositionRef.current.height > 0) {
      const container = scrollContainerRef.current
      const heightDifference = container.scrollHeight - scrollPositionRef.current.height
      container.scrollTop = scrollPositionRef.current.top + heightDifference
      scrollPositionRef.current = { height: 0, top: 0 }
    }
  }, [isFetchingNextPage, scrollContainerRef])

  // Setup Intersection Observer for scroll-to-top detection
  useEffect(() => {
    if (!enabled || !sentinelRef.current || !scrollContainerRef.current || !hasScrolledToBottom) return

    const sentinel = sentinelRef.current
    const container = scrollContainerRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && container.scrollTop < threshold) {
          setHasPaginationAttempted(true) // Mark that user scrolled to top
          if (hasNextPage && !isFetchingNextPage) {
            loadMore()
          }
        }
      },
      {
        root: container,
        rootMargin: `${threshold}px 0px 0px 0px`,
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, hasNextPage, isFetchingNextPage, loadMore, threshold, scrollContainerRef, hasScrolledToBottom])

  return {
    sentinelRef,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
    hasPaginationAttempted,
  }
}
