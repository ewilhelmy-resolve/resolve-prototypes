"use client"

import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface RitaSettingsLayoutProps {
  children?: ReactNode;
}

export default function RitaSettingsLayout({ children }: RitaSettingsLayoutProps) {
  const navigate = useNavigate()

  const handleBackToApp = () => {
    // Navigate to root, which will redirect to the default app route
    navigate('/')
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-svh w-full">
      <Sidebar>
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="flex items-center gap-2 p-2 h-8 rounded-md cursor-pointer"
                onClick={handleBackToApp}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="p-2 h-8 rounded-md">
                  <span className="text-sm">Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="p-2 h-8 rounded-md" isActive>
                  <span className="text-sm">Connection Sources</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="p-2">
            <SidebarGroupLabel className="px-2 h-8 text-xs opacity-70">
              Admin
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="p-2 h-8 rounded-md">
                  <span className="text-sm">Users</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className='p-6 flex flex-col items-center'>
        <div className="w-full max-w-7xl">
          {children}
        </div>
      </SidebarInset>
      </div>
    </SidebarProvider>
    
  )
}