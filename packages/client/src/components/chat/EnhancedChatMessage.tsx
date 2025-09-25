/**
 * EnhancedChatMessage - Improved message component with shadcn AI Chatbot styling
 *
 * Features:
 * - Professional message bubbles with proper spacing
 * - Streaming animation effects
 * - Better mobile responsiveness
 * - Enhanced status indicators
 * - Avatar integration
 */

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bot, User, Clock, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedChatMessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    message: string
    timestamp: Date
    status?: 'sending' | 'processing' | 'completed' | 'failed'
  }
  isStreaming?: boolean
  className?: string
}

export function EnhancedChatMessage({
  message,
  isStreaming = false,
  className
}: EnhancedChatMessageProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // Streaming effect for assistant messages
  useEffect(() => {
    if (isAssistant && isStreaming && message.message) {
      setIsTyping(true)
      setDisplayedText('')

      let currentIndex = 0
      const streamText = () => {
        if (currentIndex <= message.message.length) {
          setDisplayedText(message.message.slice(0, currentIndex))
          currentIndex++
          setTimeout(streamText, 20) // Adjust speed as needed
        } else {
          setIsTyping(false)
        }
      }

      streamText()
    } else {
      setDisplayedText(message.message)
      setIsTyping(false)
    }
  }, [message.message, isStreaming, isAssistant])

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 animate-pulse" />
      case 'processing':
        return <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      case 'failed':
        return <XCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (message.status) {
      case 'sending':
      case 'processing':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
      case 'completed':
        return 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'
      case 'failed':
        return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div
      className={cn(
        'group flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div className={cn(
        'flex max-w-[85%] sm:max-w-[75%] gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className={cn(
              'text-xs font-medium',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Message Content */}
        <div className="flex flex-col space-y-2 min-w-0 flex-1">
          {/* Header */}
          <div className={cn(
            'flex items-center gap-2 text-xs',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <span className="font-semibold text-foreground">
              {isUser ? 'You' : 'Rita'}
            </span>
            <span className="text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Message Bubble */}
          <div className={cn(
            'relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
            'transition-all duration-200',
            isUser
              ? 'bg-primary text-primary-foreground ml-auto'
              : 'bg-muted/50 text-foreground',
            'group-hover:shadow-md'
          )}>
            <div className="relative">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-2 h-5 bg-current animate-pulse ml-1" />
              )}
            </div>
          </div>

          {/* Status Indicator */}
          {message.status && message.status !== 'completed' && (
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium w-fit transition-all',
              getStatusColor(),
              isUser ? 'ml-auto' : 'mr-auto'
            )}>
              {getStatusIcon()}
              <span className="capitalize">
                {message.status === 'sending' ? 'Sending...' :
                 message.status === 'processing' ? 'Processing...' :
                 message.status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}