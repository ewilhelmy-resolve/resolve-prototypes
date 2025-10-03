/**
 * RitaLayout - Adapted v0.app Dashboard layout for Rita
 *
 * This layout is based on the v0.app Dashboard component but adapted to work with:
 * - React/Vite (no Next.js)
 * - Rita's authentication (Keycloak via useAuth)
 * - Rita's conversation store and API hooks
 * - Rita's knowledge base integration
 * - Rita's SSE real-time updates
 *
 * Source: https://v0.app/chat/b/b_zjL85AzE9kl
 */

"use client";

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList } from "@/components/ui/breadcrumb"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutGrid,
  File,
  Ticket,
  MessageCirclePlus,
  PanelLeft,
  ChevronDown,
  ALargeSmall,
  Plus,
  Share2,
  FileText,
  LogOut,
  SquarePen,
  User,
} from "lucide-react"
import { ShareModal } from "@/components/ShareModal"
import { useAuth } from "@/hooks/useAuth"
import { useConversations } from "@/hooks/api/useConversations"
import { useChatNavigation } from "@/hooks/useChatNavigation"
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase"
import type { Conversation } from "@/stores/conversationStore"

export interface RitaLayoutProps {
  children: React.ReactNode;
  /** Current active page for navigation highlighting */
  activePage?: "chat" | "files" | "automations" | "tickets" | "users";
}

function RitaLayoutContent({ children, activePage = "chat" }: RitaLayoutProps) {
  const { state } = useSidebar()
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const navigate = useNavigate()

  // Rita hooks
  const { user, logout } = useAuth()
  const { data: conversationsData, isLoading: conversationsLoading } = useConversations()
  const { handleNewChat, handleConversationClick, currentConversationId } = useChatNavigation()
  const {
    files: knowledgeBaseFiles,
    filesLoading: knowledgeBaseFilesLoading,
    totalFiles: totalKnowledgeBaseFiles,
    openDocumentSelector,
    documentInputRef,
    handleDocumentUpload,
  } = useKnowledgeBase()

  const conversations = conversationsData || []

  const handleSignOut = async () => {
    try {
      logout()
    } catch (error) {
      console.error("Failed to sign out:", error)
    }
  }

  const navigateToUsers = () => {
    navigate("/users")
  }

  const navigateToKnowledgeArticles = () => {
    navigate("/content")
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "U"
    const parts = user.name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return user.name.substring(0, 2).toUpperCase()
  }

  return (
    <>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar className="bg-sidebar-primary-foreground border-sidebar-border">
          <SidebarHeader className="h-[67px] flex items-left justify-start pl-2">
            <div className="flex items-center h-full pl-2">
              <img src="/logo-rita.svg" alt="Rita Logo" width={179} height={18} className="w-[179px] h-[18px]" />
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-2">
            <SidebarGroup>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
                    onClick={() => navigate("/chat")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm text-sidebar-foreground">Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
                    onClick={navigateToKnowledgeArticles}
                  >
                    <File className="w-4 h-4" />
                    <span className="text-sm text-sidebar-foreground">Knowledge Articles</span>
                    {totalKnowledgeBaseFiles > 0 && (
                      <div className="ml-auto flex items-center justify-center px-1 h-5 bg-sidebar-accent rounded text-xs text-sidebar-foreground">
                        {totalKnowledgeBaseFiles}
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="flex items-center gap-2 px-2 py-2 h-8 rounded-md">
                    <Ticket className="w-4 h-4" />
                    <span className="text-sm text-sidebar-foreground">Tickets</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="flex items-center gap-2 px-2 py-2 h-8 rounded-md"
                    onClick={navigateToUsers}
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm text-sidebar-foreground">Users</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <div className="px-2">
              <SidebarMenuItem>
                <Button
                  className="w-full gap-2 px-4 py-2 h-9 rounded-md bg-primary text-primary-foreground"
                  onClick={handleNewChat}
                >
                  <SquarePen className="w-4 h-4" />
                  New Chat
                </Button>
              </SidebarMenuItem>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="px-2 h-8 rounded-md text-xs text-sidebar-foreground">
                Recent chats
              </SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {conversationsLoading ? (
                  <div className="px-2 text-xs text-muted-foreground">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="px-2 text-xs text-muted-foreground">No conversations yet</div>
                ) : (
                  conversations.slice(0, 5).map((conversation: Conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        className="px-2 py-2 h-8 rounded-md text-sm text-sidebar-foreground"
                        onClick={() => handleConversationClick(conversation.id)}
                        isActive={conversation.id === currentConversationId}
                      >
                        <span className="truncate">{conversation.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-2 px-2 py-2 h-12 rounded-md hover:bg-sidebar-accent">
                  <Avatar className="w-8 h-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-sidebar-foreground">{user?.name || "User"}</span>
                    <span className="text-xs text-sidebar-foreground truncate">{user?.email || ""}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" side="top" align="start" sideOffset={8}>
                <div className="flex flex-col">
                  <div className="px-3 py-3 border-b border-border">
                    <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-sidebar-primary flex items-center justify-center">
                          <ALargeSmall className="w-3 h-3 text-sidebar-primary-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">Rita</span>
                          <span className="text-xs text-muted-foreground">Free plan</span>
                        </div>
                      </div>
                      <span className="text-sm text-blue-600 font-medium cursor-pointer">Upgrade</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                      onClick={() => navigate("/settings")}
                    >
                      Settings
                    </button>
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                      onClick={() => navigate("/help")}
                    >
                      Help documentation
                    </button>
                    <Separator className="my-1" />
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-[67px] border-b border-border bg-background flex items-center px-6 flex-shrink-0">
            <div className="flex items-center gap-2 h-full">
              <SidebarTrigger className="w-7 h-7 rounded-md">
                <PanelLeft className="w-4 h-4" />
              </SidebarTrigger>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <span className="text-sm text-foreground leading-none">Rita Go</span>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              {state === "collapsed" && (
                <Button
                  variant="ghost"
                  className="gap-2 h-9 px-3 text-sm text-primary hover:text-primary hover:bg-primary/10"
                  onClick={handleNewChat}
                >
                  <SquarePen className="w-4 h-4" />
                  New Chat
                </Button>
              )}
            </div>
            <div className="ml-auto">
              <div className="px-2.5 h-7 rounded-sm border border-cyan-500 bg-cyan-500/10 flex items-center">
                <span className="text-sm text-foreground">Free trial ends in 34 days</span>
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden min-w-0">
            <main className="flex-1 flex flex-col overflow-y-auto min-w-0 w-full">
              {children}
            </main>

            {/* Right sidebar - Knowledge Articles panel (only on chat page) */}
            {activePage === "chat" && (
              <aside className="hidden lg:flex w-80 border-l border-border bg-background p-6 flex-col gap-6 overflow-y-auto flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Knowledge Articles</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={openDocumentSelector}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-4 w-full justify-between">
                  <div className="flex flex-col">
                    <span className="text-2xl font-semibold text-foreground">
                      {knowledgeBaseFilesLoading ? "-" : totalKnowledgeBaseFiles}
                    </span>
                    <span className="text-xs text-muted-foreground">Articles</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-semibold text-foreground">0</span>
                    <span className="text-xs text-muted-foreground">Vectors</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-semibold text-foreground">0%</span>
                    <span className="text-xs text-muted-foreground">Accuracy</span>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  <span className="text-sm text-muted-foreground">
                    {knowledgeBaseFiles.length} recent articles
                  </span>

                  {knowledgeBaseFilesLoading ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : knowledgeBaseFiles.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        No articles yet. Add your first article to get started.
                      </p>
                      <Button
                        variant="outline"
                        onClick={openDocumentSelector}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Article
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {knowledgeBaseFiles.slice(0, 4).map((file) => (
                        <div
                          key={file.id}
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                          onClick={navigateToKnowledgeArticles}
                        >
                          <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {file.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {file.created_at?.toLocaleDateString() || "Recently added"}
                            </p>
                          </div>
                        </div>
                      ))}
                      {knowledgeBaseFiles.length > 4 && (
                        <Button
                          variant="ghost"
                          className="w-full h-9 text-sm"
                          onClick={navigateToKnowledgeArticles}
                        >
                          View all {totalKnowledgeBaseFiles} articles
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-border">
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">Share Rita</h3>
                    <p className="text-sm text-muted-foreground">
                      Invite teammates to use Rita and resolve support faster
                    </p>
                    <Button className="w-full gap-2 h-9" onClick={() => setShareModalOpen(true)}>
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for document upload */}
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        onChange={handleDocumentUpload}
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
        multiple={false}
      />

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        onNavigateToSettings={() => navigate("/settings")}
      />
    </>
  )
}

export default function RitaLayout(props: RitaLayoutProps) {
  return (
    <SidebarProvider className="w-screen">
      <RitaLayoutContent {...props} />
    </SidebarProvider>
  )
}
