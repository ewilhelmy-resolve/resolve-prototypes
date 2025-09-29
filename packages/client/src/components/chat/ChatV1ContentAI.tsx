/**
 * ChatV1ContentAI - Chat content component using ai-elements library
 *
 * This is a modern replacement for ChatV1Content.tsx that uses the ai-elements
 * component library for a more sophisticated chat experience with markdown
 * support, better accessibility, and advanced features.
 */

'use client'

import { useCallback, Fragment, useState } from 'react'
import { toast } from 'sonner'
import type { ChatStatus } from 'ai'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent } from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { Actions, Action } from '@/components/ai-elements/actions'
import { Response } from '@/components/ai-elements/response'
import { Loader } from '@/components/ai-elements/loader'
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from '@/components/ai-elements/sources'
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from '@/components/ai-elements/task'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { CopyIcon, CheckIcon, PaperclipIcon } from 'lucide-react'
import type { RitaChatState } from '@/hooks/useRitaChat'
import type {
  Message as RitaMessage,
  SimpleChatMessage,
  GroupedChatMessage,
} from '@/stores/conversationStore'
import { getMessageType } from '@/stores/conversationStore'
import { useConversationStore } from '@/stores/conversationStore'

export interface ChatV1ContentAIProps {
  // Message state
  messages: RitaChatState['messages']
  messagesLoading: RitaChatState['messagesLoading']
  isSending: RitaChatState['isSending']
  currentConversationId: RitaChatState['currentConversationId']

  // UI state
  messageValue: RitaChatState['messageValue']

  // Actions
  handleSendMessage: RitaChatState['handleSendMessage']
  handleMessageChange: RitaChatState['handleMessageChange']

  // File upload (for chat messages)
  handleFileUpload: RitaChatState['handleFileUpload']
  uploadStatus: RitaChatState['uploadStatus']

  // Refs
  fileInputRef: RitaChatState['fileInputRef']
}

/**
 * Map Rita's message status to ai-elements ChatStatus
 */
const mapRitaStatusToChatStatus = (
  isSending: boolean,
  isUploading: boolean,
  messages: RitaMessage[]
): ChatStatus => {
  if (isUploading || isSending) {
    return 'submitted'
  }

  // Check if any message is in processing state
  const hasProcessingMessage = messages.some(msg =>
    msg.status === 'processing' || msg.status === 'pending'
  )

  if (hasProcessingMessage) {
    return 'streaming'
  }

  // Check if we're waiting for AI response after user sent a message
  const lastMessage = messages[messages.length - 1]
  if (lastMessage && lastMessage.role === 'user') {
    // Find if there are any assistant messages after this user message
    const hasAssistantResponseAfter = messages.some(msg =>
      msg.role === 'assistant' &&
      msg.timestamp > lastMessage.timestamp
    )


    // If no assistant response yet and user message is sent, keep loader
    if (!hasAssistantResponseAfter && lastMessage.status === 'sent') {
      return 'streaming' // Show loader while waiting for AI response
    }
  }

  // Check if last message failed
  if (lastMessage && lastMessage.status === 'failed') {
    return 'error'
  }

  return 'ready'
}

// Helper function to get grouped content for copying
const getGroupedContent = (message: GroupedChatMessage): string => {
  return message.parts.map(part => part.message).join('\n\n')
}

// Helper function to check if a grouped message has copyable content
const hasGroupedCopyableContent = (message: GroupedChatMessage): boolean => {
  return message.parts.some(part => part.message && part.message.trim().length > 0)
}

// Helper function to check if a simple message has copyable content
const hasSimpleCopyableContent = (message: SimpleChatMessage): boolean => {
  return Boolean(message.message && message.message.trim().length > 0)
}

// Component for rendering grouped messages
function GroupedMessage({ message, onCopy, isCopied }: {
  message: GroupedChatMessage,
  onCopy: (text: string, messageId: string) => void,
  isCopied: boolean
}) {
  return (
    <Message from={message.role}>
      <div className="flex flex-col w-full">
        <MessageContent variant="flat">
          {message.parts.map((part) => {
            const type = getMessageType({ metadata: part.metadata } as RitaMessage)

            switch (type) {
              case 'reasoning':
                return (
                  <Reasoning key={part.id} isStreaming={Boolean(part.metadata?.reasoning?.streaming)}>
                    <ReasoningTrigger />
                    <ReasoningContent>{part.metadata?.reasoning?.content}</ReasoningContent>
                  </Reasoning>
                )

              case 'text':
                return <Response key={part.id}>{part.message}</Response>

              case 'sources':
                return (
                  <Sources key={part.id}>
                    <SourcesTrigger count={part.metadata?.sources?.length || 0} />
                    <SourcesContent>
                      {part.metadata?.sources?.map((source: any, i: number) => (
                        <Source key={i} href={source.url} title={source.title} />
                      ))}
                    </SourcesContent>
                  </Sources>
                )

              case 'tasks':
                return (
                  <div key={part.id} className="mt-4 space-y-2">
                    {part.metadata?.tasks?.map((task: any, i: number) => (
                      <Task key={i} defaultOpen={task.defaultOpen || i === 0}>
                        <TaskTrigger title={task.title} />
                        <TaskContent>
                          {task.items.map((item: string, j: number) => (
                            <TaskItem key={j}>{item}</TaskItem>
                          ))}
                        </TaskContent>
                      </Task>
                    ))}
                  </div>
                )

              default:
                return null
            }
          })}
        </MessageContent>

        {/* Show copy action only if there's text content to copy */}
        {hasGroupedCopyableContent(message) && (
          <Actions className="mt-2">
            <Action onClick={() => onCopy(getGroupedContent(message), message.id)} tooltip="Copy message">
              {isCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
            </Action>
          </Actions>
        )}
      </div>
    </Message>
  )
}

// Component for simple standalone messages
function SimpleMessage({ message, onCopy, isCopied }: {
  message: SimpleChatMessage,
  onCopy: (text: string, messageId: string) => void,
  isCopied: boolean
}) {
  return (
    <Message from={message.role}>
      <MessageContent variant={message.role === 'assistant' ? 'flat' : 'contained'}>
        <Response>{message.message}</Response>
      </MessageContent>

      {/* Show copy action only for assistant messages with text content */}
      {message.role === 'assistant' && hasSimpleCopyableContent(message) && (
        <Actions className="mt-2">
          <Action onClick={() => onCopy(message.message, message.id)} tooltip="Copy message">
            {isCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          </Action>
        </Actions>
      )}
    </Message>
  )
}

export default function ChatV1ContentAI({
  messages,
  messagesLoading,
  isSending,
  currentConversationId,
  messageValue,
  handleSendMessage,
  handleMessageChange,
  handleFileUpload,
  uploadStatus,
  fileInputRef,
}: ChatV1ContentAIProps) {

  // Copy state tracking for icon feedback
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  // Get grouped messages from store instead of flat messages
  const { chatMessages } = useConversationStore()

  // Determine chat status
  const chatStatus = mapRitaStatusToChatStatus(isSending, uploadStatus.isUploading, messages)

  // Handle form submission from PromptInput
  const handlePromptSubmit = useCallback(async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text)
    const hasAttachments = Boolean(message.files?.length)

    if (!(hasText || hasAttachments)) {
      return
    }

    // If we have text, update Rita's message value
    if (message.text) {
      handleMessageChange(message.text)
    }

    // Handle file uploads if present
    if (message.files && message.files.length > 0) {
      // Convert FileUIPart back to File for Rita's handler
      // Note: This is a simplified approach - in a real implementation,
      // you might need to handle the file conversion differently
      const fileEvent = {
        target: {
          files: message.files as any // Type assertion for compatibility
        }
      } as React.ChangeEvent<HTMLInputElement>

      handleFileUpload(fileEvent)
    }

    // Use setTimeout to ensure state is updated before sending
    setTimeout(async () => {
      await handleSendMessage()
    }, 0)
  }, [handleMessageChange, handleSendMessage, handleFileUpload])

  // Handle copy action with visual feedback
  const handleCopy = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      toast.success('Message copied to clipboard')
      // Reset copied state after 2 seconds (same as ai-elements pattern)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      toast.error('Failed to copy message')
    }
  }, [])

  // Handle direct attachment button click
  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [fileInputRef])


  return (
    <div className="h-full flex flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messagesLoading || (currentConversationId && chatMessages.length === 0) ? (
            <div className="flex items-center justify-center h-full">
              <Loader size={24} />
            </div>
          ) : !currentConversationId || chatMessages.length === 0 ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <ConversationEmptyState
                title="Ask Rita"
                description="Diagnose and resolve issues, then create automations to speed up future remediation"
              />
            </div>
          ) : (
            <>
              {/* Render grouped chat messages */}
              {chatMessages.map((chatMessage) => (
                <Fragment key={chatMessage.id}>
                  {chatMessage.isGroup ? (
                    <GroupedMessage
                      message={chatMessage as GroupedChatMessage}
                      onCopy={handleCopy}
                      isCopied={copiedMessageId === chatMessage.id}
                    />
                  ) : (
                    <SimpleMessage
                      message={chatMessage as SimpleChatMessage}
                      onCopy={handleCopy}
                      isCopied={copiedMessageId === chatMessage.id}
                    />
                  )}
                </Fragment>
              ))}

              {/* Show loader when processing */}
              {(chatStatus === 'submitted' || chatStatus === 'streaming') && <Loader />}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Modern input using PromptInput */}
      <div className="p-4 xborder-t border-gray-200 bg-white">

        <div className="max-w-4xl mx-auto">
          <PromptInput
            onSubmit={handlePromptSubmit}
            globalDrop
            multiple
            accept="image/*,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
            maxFiles={5}
            maxFileSize={10 * 1024 * 1024} // 10MB
          >
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                onChange={(e) => handleMessageChange(e.target.value)}
                value={messageValue}
                placeholder="Ask me anything..."
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton
                  onClick={handleAttachmentClick}
                  variant="ghost"
                  disabled={uploadStatus.isUploading}
                >
                  <PaperclipIcon size={16} />
                  <span className="sr-only">Add attachment</span>
                </PromptInputButton>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!messageValue.trim() && chatStatus !== 'streaming'}
                status={chatStatus}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>

      {/* Hidden file input for compatibility with existing Rita handlers */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
        disabled={uploadStatus.isUploading}
        multiple={false}
      />
    </div>
  )
}