/**
 * EnhancedChatContainer - Improved chat container with smooth animations
 *
 * Features:
 * - Auto-scroll management that doesn't interfere with user scrolling
 * - Smooth animations for new messages
 * - Better spacing and layout
 * - Loading states and empty states
 * - Mobile-optimized design
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { EnhancedChatMessage } from './EnhancedChatMessage'
import { cn } from '@/lib/utils'
import { Loader2, MessageSquare } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  message: string
  timestamp: Date
  status?: 'sending' | 'processing' | 'completed' | 'failed'
}

interface EnhancedChatContainerProps {
  messages: Message[]
  isLoading?: boolean
  isSending?: boolean
  className?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
}

export function EnhancedChatContainer({
  messages,
  isLoading = false,
  isSending = false,
  className,
  emptyStateTitle = "Ask Rita",
  emptyStateDescription = "Diagnose and resolve issues, then create automations to speed up future remediation"
}: EnhancedChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isUserNearBottomRef = useRef(true)

  // Check if user is near bottom of chat
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
    isUserNearBottomRef.current = isNearBottom
  }, [])

  // Auto-scroll to bottom when new messages arrive, but only if user is already at bottom
  useEffect(() => {
    if (isUserNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages.length])

  // Always scroll to bottom when sending a new message
  useEffect(() => {
    if (isSending && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [isSending])

  if (isLoading) {
    return (
      <div className={cn(
        'flex-1 flex items-center justify-center p-4',
        className
      )}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading messages...</span>
        </div>
      </div>
    )
  }

  if (!messages.length) {
    return (
      <div className={cn(
        'flex-1 flex items-center justify-center p-8',
        className
      )}>
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-foreground font-serif">
              {emptyStateTitle}
            </h3>
            <p className="text-muted-foreground">
              {emptyStateDescription}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'flex-1 overflow-y-auto scroll-smooth',
        'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
        className
      )}
    >
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{
              animationDelay: `${Math.min(index * 50, 300)}ms`,
              animationFillMode: 'both'
            } as React.CSSProperties}
          >
            <EnhancedChatMessage
              message={message}
              isStreaming={
                index === messages.length - 1 &&
                message.role === 'assistant' &&
                message.status === 'processing'
              }
            />
          </div>
        ))}

        {/* Thinking indicator for assistant */}
        {isSending && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 max-w-[85%] sm:max-w-[75%]">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center">
                  <div className="h-4 w-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Rita is thinking</span>
                  <div className="flex gap-1 ml-1">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>
    </div>
  )
}