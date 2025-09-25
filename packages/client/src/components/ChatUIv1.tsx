"use client"

import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageCirclePlus, LayoutGrid, Newspaper, Ticket, User, Search, Share2, LifeBuoy, Zap, Paperclip, SendHorizontal, Plus, PanelLeft, Send, LogOut } from "lucide-react"

// Import existing functionality
import { SSEProvider, useSSEContext } from '../contexts/SSEContext'
import { useAuth } from '../contexts/AuthContext'
import { useConversationStore } from '../stores/conversationStore'
import { useUIStore } from '../stores/uiStore'
import { useConversations, useConversationMessages, useCreateConversation, useSendMessage } from '../hooks/api/useConversations'
import { useUploadFile } from '../hooks/api/useFiles'

const RitaChatInterface: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { latestUpdate } = useSSEContext()
  const { logout } = useAuth()
  const { toggleSidebar } = useUIStore()

  const [searchValue, setSearchValue] = useState("")
  const [messageValue, setMessageValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Store state
  const {
    currentConversationId,
    messages,
    isSending,
    updateMessage,
    clearCurrentConversation,
    setCurrentConversation,
  } = useConversationStore()

  // Queries and mutations
  useConversations() // Keep conversations in sync
  const { isLoading: messagesLoading } = useConversationMessages(currentConversationId)
  const createConversationMutation = useCreateConversation()
  const sendMessageMutation = useSendMessage()
  const uploadFileMutation = useUploadFile()

  // Sync URL parameter with conversation store
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversation(conversationId)
    } else if (!conversationId && currentConversationId) {
      setCurrentConversation(null)
    }
  }, [conversationId, currentConversationId, setCurrentConversation])

  // Handle SSE message updates
  useEffect(() => {
    if (latestUpdate) {
      console.log('Applying SSE update to store:', latestUpdate)
      updateMessage(latestUpdate.messageId, {
        status: latestUpdate.status,
        error_message: latestUpdate.errorMessage,
      })
    }
  }, [latestUpdate, updateMessage])

  const handleNewChat = () => {
    clearCurrentConversation()
    navigate('/v1')
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        handleNewChat()
      }
      // Ctrl+B or Cmd+B for toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleNewChat, toggleSidebar])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageValue.trim() || isSending) return

    const messageContent = messageValue
    const tempId = `msg_${Date.now()}`

    setMessageValue('')

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSignOut = async () => {
    try {
      logout()
    } catch (error) {
      console.error('Failed to sign out:', error)
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Mobile Navigation */}
        <nav className="bg-primary border-b px-6 h-16 flex items-center justify-between w-full lg:hidden">
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
                <Button variant="ghost" size="icon" onClick={handleNewChat}>
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
        <div className="hidden lg:block">
          <nav className="bg-primary border-b px-6 h-16 flex items-center justify-between w-full">
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
                <Button variant="ghost" className="px-3 py-2.5 rounded-md text-primary">
                  Settings
                </Button>
                <Button variant="ghost" size="icon" className="w-9 h-9" onClick={handleNewChat}>
                  <MessageCirclePlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-9 h-9">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-9 h-9">
                  <LifeBuoy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="h-9">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-blue-700 gap-1"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary-foreground text-primary">GP</AvatarFallback>
              </Avatar>
            </div>
          </nav>
        </div>

        <div className="flex flex-1">
          {/* Sidebar */}
          <Sidebar className="hidden lg:block bg-sidebar border-r">
            <SidebarHeader className="p-4">
              <div className="px-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9 h-9 bg-background border-input"
                  />
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8" onClick={handleNewChat}>
                        <MessageCirclePlus className="h-4 w-4" />
                        <span>New chat</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <LayoutGrid className="h-4 w-4" />
                        <span>Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs opacity-70">Manage</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <Newspaper className="h-4 w-4" />
                        <span>Knowledge articles</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <Ticket className="h-4 w-4" />
                        <span>Tickets</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <User className="h-4 w-4" />
                        <span>Users</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs opacity-70">Recent chats</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <span>Password reset articles</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8 bg-sidebar-accent text-sidebar-accent-foreground">
                        <span>VPN Connection Troubleshooting</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <span>Two-factor authentication setup</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <span>Phishing awareness guide</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-8">
                        <span>Email Configuration Setup</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* Main Chat Area */}
          <main className="flex-1 bg-background">
            <div className="p-2 h-full">
              <div className="bg-white border border-neutral-100 h-full flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 flex flex-col">
                  {messagesLoading || (currentConversationId && messages.length === 0) ? (
                    <div className="flex-1 p-4">
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
                    </div>
                  ) : !currentConversationId || messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                      <div className="text-center space-y-2.5 mb-[100px]">
                        <h1 className="text-5xl font-medium text-foreground font-serif">Ask Rita</h1>
                        <p className="text-base text-foreground">Diagnose and resolve issues, then create automations to speed up future remediation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-4">
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
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-3 border border-input rounded-md mx-3 mb-3">
                  <div className="text-sm text-muted-foreground mb-2.5">Ask me anything...</div>
                  <div className="flex items-center justify-between">
                    <Textarea
                      value={messageValue}
                      onChange={(e) => setMessageValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder=""
                      className="flex-1 resize-none min-h-[40px] max-h-[120px] border-0 p-0 focus:ring-0 shadow-none"
                      rows={1}
                      disabled={isSending}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9"
                        onClick={openFileSelector}
                        disabled={uploadFileMutation.isPending}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="w-9 h-9"
                        onClick={handleSendMessage}
                        disabled={!messageValue.trim() || isSending}
                      >
                        <SendHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Right Panel */}
          <div className="w-72 bg-background p-4 space-y-6 hidden lg:block">
            <Card className="border">
              <CardHeader className="space-y-1.5">
                <CardTitle className="text-2xl font-medium font-serif">Share Rita</CardTitle>
                <p className="text-sm text-muted-foreground">Invite teammates to use Rita and resolve support faster.</p>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-medium font-serif">Knowledge base</h4>
                <Button variant="outline" size="icon">
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
    </SidebarProvider>
  )
}

export default function ChatUIv1() {
  const { authenticated, loading, sessionReady } = useAuth()

  console.log('ChatUIv1 render - authenticated:', authenticated, 'loading:', loading, 'sessionReady:', sessionReady, 'SSE enabled:', authenticated && !loading && sessionReady)

  return (
    <SSEProvider
      apiUrl=""
      enabled={authenticated && !loading && sessionReady}
    >
      <RitaChatInterface />
    </SSEProvider>
  )
}