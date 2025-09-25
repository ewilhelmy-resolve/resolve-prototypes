/**
 * RitaLayout Component
 *
 * Professional chat interface layout for Rita Go application.
 *
 * Features:
 * - Responsive three-column layout (left sidebar, main content, right panel)
 * - Mobile-first responsive design with collapsible navigation
 * - Fixed header navigation with user controls
 * - Persistent bottom input area for chat functionality
 * - Knowledge base integration panel
 * - Accessible UI components and keyboard navigation
 *
 * Based on Figma-to-shadcn design system workflow
 * Original source: https://rdhlrr8yducbb6dq.public.blob.vercel-storage.com/figma-to-shadcn/RitaLayout-nC4xjmqj08N0LSWPCC3rHEHG2azW4y.json
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageCirclePlus, LayoutGrid, Newspaper, Ticket, User, Search, Share2, LifeBuoy, Zap, Paperclip, SendHorizontal, Plus, PanelLeft } from "lucide-react"

// Import conversation functionality
import { useConversationStore } from "@/stores/conversationStore"
import { useConversations, useCreateConversation, useSendMessage, useConversationMessages } from "@/hooks/api/useConversations"
import { useUploadFile } from "@/hooks/api/useFiles"

export default function RitaLayout() {
  const [searchValue, setSearchValue] = useState("")
  const [messageValue, setMessageValue] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Navigation and conversation state
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const { conversations, currentConversationId, clearCurrentConversation, setCurrentConversation, messages, isSending } = useConversationStore()
  const { data: fetchedConversations, isLoading: conversationsLoading } = useConversations()
  const { isLoading: messagesLoading } = useConversationMessages(currentConversationId)
  const createConversationMutation = useCreateConversation()
  const sendMessageMutation = useSendMessage()
  const uploadFileMutation = useUploadFile()

  // Use fetched conversations if available, fallback to store
  const conversationList = fetchedConversations || conversations

  // Filter conversations based on search
  const filteredConversations = conversationList.filter(conv =>
    conv.title.toLowerCase().includes(searchValue.toLowerCase())
  )

  // Sync URL parameter with conversation store
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversation(conversationId)
    } else if (!conversationId && currentConversationId) {
      setCurrentConversation(null)
    }
  }, [conversationId, currentConversationId, setCurrentConversation])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = () => {
    clearCurrentConversation()
    navigate('/v1')
  }

  const handleConversationClick = (conversationId: string) => {
    navigate(`/v1/${conversationId}`)
  }

  const handleSendMessage = async () => {
    if (!messageValue.trim() || isSending) return

    const messageContent = messageValue
    const tempId = `msg_${Date.now()}`

    setMessageValue("")

    try {
      let conversationId = currentConversationId

      // Create conversation if we don't have one
      if (!conversationId) {
        const conversation = await createConversationMutation.mutateAsync({
          title: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '')
        })
        conversationId = conversation.id
        // Navigate to the new conversation URL
        navigate(`/v1/${conversationId}`)
      }

      // Send message
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: messageContent,
        tempId,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      uploadFileMutation.mutate(file)
    }
  }

  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Mobile Navigation */}
      <nav className="bg-primary border-b px-6 py-3 flex items-center justify-between w-full lg:hidden flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-[100px] h-[19px]">
            <svg className="w-full h-full">
              <circle cx="50" cy="10" r="8" fill="currentColor" />
            </svg>
          </div>
          <span className="text-white text-lg font-medium">Rita GO</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <PanelLeft className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col gap-4">
              <Button variant="ghost" className="justify-start text-primary">
                Settings
              </Button>
              <Button variant="ghost" size="icon">
                <MessageCirclePlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <LifeBuoy className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-start">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>

      {/* Desktop Navigation */}
      <nav className="bg-primary border-b px-6 py-3 items-center justify-between w-full hidden lg:flex flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-[100px] h-[19px]">
            <svg className="w-full h-full">
              <circle cx="50" cy="10" r="8" fill="currentColor" />
            </svg>
          </div>
          <span className="text-white text-lg font-medium">Rita GO</span>
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-md">
            <PanelLeft className="h-4 w-4 text-background" />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="px-3 py-2.5 rounded-md text-white">
              Settings
            </Button>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-white">
              <MessageCirclePlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-white">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-white">
              <LifeBuoy className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="h-9 bg-transparent border-white text-white hover:bg-white hover:text-primary">
            <Zap className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary-foreground text-primary">GP</AvatarFallback>
          </Avatar>
          <Button variant="ghost" className="px-3 py-2.5 rounded-md text-white">
            Logout
          </Button>
        </div>
      </nav>

      {/* Content area with sidebars below header */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col hidden lg:flex">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9 h-9 bg-background border-input"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <Button className="w-full justify-start" onClick={handleNewChat}>
                <MessageCirclePlus className="h-4 w-4 mr-2" />
                New chat
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
            <div className="px-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">MANAGE</h4>
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start h-8">
                  <Newspaper className="h-4 w-4 mr-2" />
                  <span className="text-sm">Knowledge articles</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8">
                  <Ticket className="h-4 w-4 mr-2" />
                  <span className="text-sm">Tickets</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8">
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm">Users</span>
                </Button>
              </div>
            </div>
            <div className="px-4 mt-6">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">RECENT CHATS</h4>
              <div className="space-y-1">
                {conversationsLoading ? (
                  // Loading skeleton
                  <div className="space-y-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-2 rounded-lg">
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  // Empty state
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">No conversations yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs h-7"
                      onClick={handleNewChat}
                    >
                      Start your first chat
                    </Button>
                  </div>
                ) : (
                  // Conversation list
                  filteredConversations.map((conversation) => (
                    <Button
                      key={conversation.id}
                      variant={conversation.id === currentConversationId ? "secondary" : "ghost"}
                      className="w-full justify-start h-8 text-left"
                      onClick={() => handleConversationClick(conversation.id)}
                    >
                      <span className="text-sm truncate">{conversation.title}</span>
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-white">
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
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2">
                <textarea
                  value={messageValue}
                  onChange={(e) => setMessageValue(e.target.value)}
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
                  disabled={uploadFileMutation.isPending}
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
        </main>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col hidden lg:flex">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-2">Share Rita</h2>
            <p className="text-sm text-gray-600 mb-3">
              Invite teammates to use Rita and resolve support faster.
            </p>
            <Button className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          <div className="flex-1 p-4">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">Knowledge base</h3>
              <Button variant="outline" size="icon" className="float-right -mt-6">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Card className="flex-1 p-3 border">
                  <div className="space-y-0">
                    <h3 className="text-2xl font-medium font-serif">0</h3>
                    <p className="text-sm text-muted-foreground">Articles</p>
                  </div>
                </Card>
                <Card className="flex-1 p-3 border">
                  <div className="space-y-0">
                    <h3 className="text-2xl font-medium font-serif text-card-foreground">0</h3>
                    <p className="text-sm text-muted-foreground">Vectors</p>
                  </div>
                </Card>
                <Card className="flex-1 p-3 border">
                  <div className="space-y-0">
                    <h3 className="text-2xl font-medium font-serif text-card-foreground">0%</h3>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                  </div>
                </Card>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-sm">0</span>
                <span className="text-sm text-muted-foreground">recent articles</span>
              </div>

              <Card className="p-6 border rounded-lg text-center space-y-6">
                <div className="w-12 h-12 bg-card border rounded-md flex items-center justify-center mx-auto">
                  <Newspaper className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium font-serif">No Articles Found</h3>
                  <p className="text-sm text-muted-foreground">Add your knowledge base articles and unlock instant chat with your company's articles.</p>
                </div>
                <Button variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Articles
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
        disabled={uploadFileMutation.isPending}
      />

      {/* Upload status messages */}
      {uploadFileMutation.isError && (
        <div className="fixed bottom-4 right-4 p-3 bg-red-50 border border-red-200 rounded-md max-w-sm z-50">
          <div className="flex items-center gap-2 text-red-700">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">
              {uploadFileMutation.error?.message || 'Upload failed'}
            </span>
          </div>
        </div>
      )}

      {uploadFileMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 p-3 bg-green-50 border border-green-200 rounded-md max-w-sm z-50">
          <div className="flex items-center gap-2 text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">File uploaded successfully!</span>
          </div>
        </div>
      )}
    </div>
  )
}