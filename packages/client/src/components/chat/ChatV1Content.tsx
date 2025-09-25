/**
 * ChatV1Content - Chat content component for Rita v1 interface
 *
 * This component contains only the chat-specific content (messages, input)
 * and is designed to be used within the shared RitaV1Layout.
 *
 * Handles:
 * - Message display and loading states
 * - Chat input with file attachment
 * - Empty state for new conversations
 */

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Paperclip, SendHorizontal } from "lucide-react"
import type { RitaChatState } from "@/hooks/useRitaChat"

export interface ChatV1ContentProps {
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
  handleKeyPress: RitaChatState['handleKeyPress']

  // File upload (for chat messages)
  handleFileUpload: RitaChatState['handleFileUpload']
  openFileSelector: RitaChatState['openFileSelector']
  uploadStatus: RitaChatState['uploadStatus']

  // Refs
  fileInputRef: RitaChatState['fileInputRef']
  messagesEndRef: RitaChatState['messagesEndRef']
}

export default function ChatV1Content({
  messages,
  messagesLoading,
  isSending,
  currentConversationId,
  messageValue,
  handleSendMessage,
  handleMessageChange,
  handleKeyPress,
  handleFileUpload,
  openFileSelector,
  uploadStatus,
  fileInputRef,
  messagesEndRef,
}: ChatV1ContentProps) {

  return (
    <>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messagesLoading || (currentConversationId && messages.length === 0) ? (
          <div className="max-w-4xl mx-auto space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : !currentConversationId || messages.length === 0 ? (
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-full">
            <div className="text-center space-y-2.5">
              <h1 className="text-5xl font-medium text-foreground font-serif">Ask Rita</h1>
              <p className="text-base text-foreground">Diagnose and resolve issues, then create automations to speed up future remediation</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
              >
                <div className={`max-w-[85%] ${message.role === 'user' ? 'ml-auto' : ''}`}>
                  <div className="min-w-0">
                    <div className={`flex items-center gap-2 mb-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      <span className="text-sm font-semibold">
                        {message.role === 'user' ? 'You' : 'Rita'}
                      </span>
                      <span className="text-xs text-muted-foreground/70 font-medium">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {message.role === 'user' ? (
                      <div className="text-sm rounded-2xl px-4 py-3" style={{ backgroundColor: '#F7F9FF' }}>
                        <p className="leading-relaxed text-gray-800">{message.message}</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="leading-relaxed text-gray-800">{message.message}</p>
                      </div>
                    )}

                    {/* Status indicator for user messages */}
                    {message.role === 'user' && message.status !== 'completed' && (
                      <div className={`mt-3 flex items-center gap-2 text-xs ${message.role === 'user' ? 'justify-end' : ''}`}>
                        <div className={`px-2 py-1 rounded-full flex items-center gap-1.5 ${
                          message.status === 'failed'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        }`}>
                          {message.status === 'sending' && (
                            <>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="font-medium">Sending...</span>
                            </>
                          )}
                          {message.status === 'pending' && (
                            <>
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                              <span className="font-medium">Waiting for response...</span>
                            </>
                          )}
                          {message.status === 'processing' && (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                              <span className="font-medium">Processing...</span>
                            </>
                          )}
                          {message.status === 'failed' && (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="font-medium">
                                Failed to send {message.error_message && `- ${message.error_message}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <textarea
              value={messageValue}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything..."
              aria-label="Message input"
              disabled={isSending}
              className="flex-1 resize-none min-h-[40px] max-h-[120px] border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={1}
            />
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9"
              onClick={openFileSelector}
              disabled={uploadStatus.isUploading}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="w-9 h-9"
              onClick={handleSendMessage}
              disabled={!messageValue.trim() || isSending}
              aria-label="Send message"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden file input for chat attachments */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
        disabled={uploadStatus.isUploading}
        multiple={false}
      />
    </>
  )
}