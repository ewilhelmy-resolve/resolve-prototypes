"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function RitaSettingsLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-white">
        <Sidebar className="w-64 p-4">
          <div className="flex flex-col gap-4">
            <SidebarMenuSubItem className="flex items-center gap-2 px-2 h-7 rounded-md w-56">
              <ArrowLeft className="h-4 w-4 text-sidebar-foreground" />
              <span className="text-sm text-sidebar-foreground">Settings</span>
            </SidebarMenuSubItem>

            <SidebarContent className="w-56 space-y-0">
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full px-2 py-2 h-8 rounded-md">
                  <span className="text-sm text-sidebar-foreground">Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton className="w-full px-2 py-2 h-8 rounded-md">
                  <span className="text-sm text-sidebar-foreground">Users & Roles</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton className="w-full px-2 py-2 h-8 rounded-md bg-sidebar-accent">
                  <span className="text-sm text-sidebar-accent-foreground">Connection Sources</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarContent>
          </div>
        </Sidebar>

        <div className="flex-1 p-6">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-medium text-foreground">Connection Sources</h3>
              <p className="text-sm text-muted-foreground">
                Connect your knowledge and ticketing sources to help Rita resolve IT issues faster.
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-6 rounded-md">
              <div className="flex flex-col gap-5">
                <Card className="p-4 border border-border bg-popover">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-col">
                        <p className="text-base font-bold text-foreground">Atlassian Confluence</p>
                        <p className="text-sm text-foreground">Status: Not connected</p>
                        <p className="text-sm text-foreground">Last sync: —</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs font-bold">Knowledge</Badge>
                      </div>
                    </div>
                    <div className="flex justify-end items-center">
                      <Button variant="secondary">Configure</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border border-border bg-popover">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-col">
                        <p className="text-base font-bold text-foreground">Microsoft SharePoint</p>
                        <p className="text-sm text-foreground">Status: Not connected</p>
                        <p className="text-sm text-foreground">Last sync: —</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs font-bold">Knowledge</Badge>
                      </div>
                    </div>
                    <div className="flex justify-end items-center">
                      <Button variant="secondary">Configure</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border border-border bg-popover">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-col">
                        <p className="text-base font-bold text-foreground">ServiceNow</p>
                        <p className="text-sm text-foreground">Status: Not connected</p>
                        <p className="text-sm text-foreground">Last sync: —</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs font-bold">Knowledge</Badge>
                        <Badge variant="secondary" className="text-xs font-bold">Ticketing</Badge>
                      </div>
                    </div>
                    <div className="flex justify-end items-center">
                      <Button variant="secondary">Configure</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border border-border bg-popover">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-col">
                        <p className="text-base font-bold text-foreground">Web Search (LGA)</p>
                        <p className="text-sm text-foreground">Status: Enabled</p>
                        <p className="text-sm text-foreground">Use web results to supplement answers when knowledge isn't found.</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs font-bold">Knowledge</Badge>
                      </div>
                    </div>
                    <div className="flex justify-end items-center">
                      <Button variant="secondary">Enabled</Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}