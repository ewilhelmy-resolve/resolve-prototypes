"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MessageCirclePlus, LayoutGrid, Newspaper, Ticket, User, Search, Share2, LifeBuoy, Zap, Paperclip, SendHorizontal, Plus, PanelLeft } from "lucide-react"

export default function RitaLayout() {
  const [searchValue, setSearchValue] = useState("")
  const [messageValue, setMessageValue] = useState("")

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
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
                <Button variant="ghost" size="icon" className="w-9 h-9">
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
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary-foreground text-primary">GP</AvatarFallback>
              </Avatar>
            </div>
          </nav>
        </div>

        <div className="flex flex-1">
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
                      <SidebarMenuButton className="h-8">
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

          <main className="flex-1 bg-background">
            <div className="p-2 h-full">
              <div className="bg-white border border-neutral-100 h-full flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <div className="text-center space-y-2.5 mb-[276px]">
                    <h1 className="text-5xl font-medium text-foreground font-serif">Ask Rita</h1>
                    <p className="text-base text-foreground">Diagnose and resolve issues, then create automations to speed up future remediation</p>
                  </div>
                </div>
                <div className="p-3 border border-input rounded-md mx-3 mb-3">
                  <div className="text-sm text-muted-foreground mb-2.5">Ask me anything...</div>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="w-9 h-9">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button size="icon" className="w-9 h-9">
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </main>

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
      </div>
    </SidebarProvider>
  )
}