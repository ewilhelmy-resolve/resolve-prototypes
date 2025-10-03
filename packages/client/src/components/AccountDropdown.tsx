"use client"

import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Settings, LogOut, Code2 } from "lucide-react"

interface AccountDropdownProps {
  onSignOut: () => void
}

export default function AccountDropdown({ onSignOut }: AccountDropdownProps) {
  const navigate = useNavigate()

  const handleSettings = () => {
    navigate('/settings')
  }

  const handleDevTools = () => {
    navigate('/devtools')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="outline-none focus:outline-none">
          <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarFallback className="bg-primary-foreground text-primary">
              CS
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleSettings}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleDevTools}
        >
          <Code2 className="mr-2 h-4 w-4" />
          <span>Developer Tools</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}