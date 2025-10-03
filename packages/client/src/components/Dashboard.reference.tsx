import { useState } from "react"
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
  PanelLeft,
  ChevronDown,
  SendHorizontal,
  ALargeSmall,
  Plus,
  Share2,
  FileText,
  LogOut,
  SquarePen,
} from "lucide-react"
import { ShareModal } from "./ShareModal"

function DashboardContent() {
  const { state } = useSidebar()
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const handleNewChat = () => {
    // Reset chat state - for now just a placeholder
    // In the future, this will clear messages and reset the chat interface
    console.log("[v0] Starting new chat")
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
                  <SidebarMenuButton className="flex items-center gap-2 px-2 py-2 h-8 rounded-md">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm text-sidebar-foreground">Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="flex items-center gap-2 px-2 py-2 h-8 rounded-md">
                    <File className="w-4 h-4" />
                    <span className="text-sm text-sidebar-foreground">Knowledge Articles</span>
                    <div className="ml-auto flex items-center justify-center px-1 h-5 bg-sidebar-accent rounded text-xs text-sidebar-foreground">
                      23
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="flex items-center gap-2 px-2 py-2 h-8 rounded-md">
                    <Ticket className="w-4 h-4" />
                    <span className="text-sm text-sidebar-foreground">Tickets</span>
                    <div className="ml-auto flex items-center justify-center px-1 h-5 bg-sidebar-accent rounded text-xs text-sidebar-foreground">
                      232
                    </div>
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
                <SidebarMenuItem>
                  <SidebarMenuButton className="px-2 py-2 h-8 rounded-md text-sm text-sidebar-foreground">
                    Reset password
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="px-2 py-2 h-8 rounded-md text-sm text-sidebar-foreground">
                    Network Access
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="px-2 py-2 h-8 rounded-md text-sm text-sidebar-foreground">
                    VPN setup documentation
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="px-2 py-2 h-8 rounded-md text-sm text-sidebar-foreground">
                    Meeting Notes
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton className="px-2 py-2 h-8 rounded-md text-sm text-sidebar-foreground">
                    More Options
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-2 px-2 py-2 h-12 rounded-md hover:bg-sidebar-accent">
                  <Avatar className="w-8 h-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      Aa
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-sidebar-foreground">Charlie</span>
                    <span className="text-xs text-sidebar-foreground">Acme Organization</span>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" side="top" align="start" sideOffset={8}>
                <div className="flex flex-col">
                  <div className="px-3 py-3 border-b border-border">
                    <p className="text-sm text-muted-foreground">charlie@acme.com</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-sidebar-primary flex items-center justify-center">
                          <ALargeSmall className="w-3 h-3 text-sidebar-primary-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">Acme</span>
                          <span className="text-xs text-muted-foreground">Free plan</span>
                        </div>
                      </div>
                      <span className="text-sm text-blue-600 font-medium">Upgrade</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <div className="w-full px-3 py-2 text-sm text-foreground">Settings</div>
                    <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center">
                      Help documentation
                    </button>
                    <Separator className="my-1" />
                    <button className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2">
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
            <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto min-w-0 w-full">
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center space-y-4 md:space-y-6 max-w-2xl w-full px-4">
                  <h1 className="text-4xl md:text-5xl font-normal text-foreground font-serif">Ask Rita</h1>
                  <p className="text-sm md:text-base text-foreground">
                    Diagnose and resolve issues, then create automations to speed up future remediation
                  </p>
                </div>
              </div>

              <div className="border border-input rounded-md p-3 space-y-2.5 w-full max-w-3xl mx-auto">
                <p className="text-base text-muted-foreground">How can I help?</p>
                <div className="flex justify-between items-center">
                  <div className="w-18 h-9"></div>
                  <Button variant="outline" size="icon" className="w-9 h-9 rounded-md bg-transparent">
                    <SendHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </main>

            <aside className="hidden lg:flex w-80 border-l border-border bg-background p-6 flex-col gap-6 overflow-y-auto flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Knowledge Articles</h2>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-4 w-full justify-between">
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-foreground">20</span>
                  <span className="text-xs text-muted-foreground">Articles</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-foreground">100</span>
                  <span className="text-xs text-muted-foreground">Vectors</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-foreground">85%</span>
                  <span className="text-xs text-muted-foreground">Accuracy</span>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <span className="text-sm text-muted-foreground">4 recent articles</span>

                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer">
                    <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Policy_Update_2024.pdf</p>
                      <p className="text-xs text-muted-foreground">2 mb</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer">
                    <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">SOP_guidelines.doc</p>
                      <p className="text-xs text-muted-foreground">233 mb</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer">
                    <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Employee_Handbook_v2.pdf</p>
                      <p className="text-xs text-muted-foreground">1 gb</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer">
                    <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Security_Protocol_Checklist.pdf</p>
                      <p className="text-xs text-muted-foreground">400 mb</p>
                    </div>
                  </div>
                </div>

                <Button variant="ghost" className="w-full h-9 text-sm">
                  See all
                </Button>
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
          </div>
        </div>
      </div>
      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} onNavigateToSettings={() => {}} />
    </>
  )
}

export default function Dashboard() {
  return (
    <SidebarProvider className="w-screen">
      <DashboardContent />
    </SidebarProvider>
  )
}
