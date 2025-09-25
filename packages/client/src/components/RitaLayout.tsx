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

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MessageCirclePlus, LayoutGrid, Newspaper, Ticket, User, Search, Share2, LifeBuoy, Zap, Paperclip, SendHorizontal, Plus, PanelLeft } from "lucide-react"

export default function RitaLayout() {
  const [searchValue, setSearchValue] = useState("")
  const [messageValue, setMessageValue] = useState("")

  const handleSendMessage = () => {
    if (!messageValue.trim()) return

    // TODO: Implement message sending logic
    console.log('Sending message:', messageValue)
    setMessageValue("")
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
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
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9 h-9 bg-background border-input"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <Button className="w-full justify-start">
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
                <Button variant="ghost" className="w-full justify-start h-8">
                  <span className="text-sm">Password reset articles</span>
                </Button>
                <Button variant="secondary" className="w-full justify-start h-8">
                  <span className="text-sm">VPN Connection Troubleshooting</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8">
                  <span className="text-sm">Two-factor authentication setup</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8">
                  <span className="text-sm">Phishing awareness guide</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8">
                  <span className="text-sm">Email Configuration Setup</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-full">
              <div className="text-center space-y-2.5">
                <h1 className="text-5xl font-medium text-foreground font-serif">Ask Rita</h1>
                <p className="text-base text-foreground">Diagnose and resolve issues, then create automations to speed up future remediation</p>
              </div>
            </div>
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
                  className="flex-1 resize-none min-h-[40px] max-h-[120px] border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  rows={1}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="w-9 h-9"
                  onClick={handleSendMessage}
                  disabled={!messageValue.trim()}
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
    </div>
  )
}