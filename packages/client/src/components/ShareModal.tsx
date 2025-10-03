"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserPlus, X } from "lucide-react"

// Mock user data
const mockUsers = [
  { id: 1, name: "Sarah Johnson", email: "sarah.johnson@acme.com", initials: "SJ", role: "Admin" },
  { id: 2, name: "Mike Chen", email: "mike.chen@acme.com", initials: "MC", role: "Member" },
  { id: 3, name: "Emily Rodriguez", email: "emily.r@acme.com", initials: "ER", role: "Member" },
  { id: 4, name: "David Kim", email: "david.kim@acme.com", initials: "DK", role: "Member" },
]

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateToSettings?: () => void
}

export function ShareModal({ open, onOpenChange, onNavigateToSettings }: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const noResults = searchQuery.length > 0 && filteredUsers.length === 0

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleShare = () => {
    console.log("[v0] Sharing with users:", selectedUsers)
    // Reset and close
    setSelectedUsers([])
    setSearchQuery("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Share Rita</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Search for team members to share Rita access with
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              className="pl-9 h-10 bg-background border-input"
            />
          </div>

          {/* Dropdown Results */}
          {showDropdown && searchQuery && (
            <div className="border border-border rounded-md bg-popover max-h-64 overflow-y-auto">
              {noResults ? (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">No users found for "{searchQuery}"</p>
                  <Button
                    variant="outline"
                    className="w-full gap-2 h-9 border-dashed bg-transparent"
                    onClick={() => {
                      onOpenChange(false)
                      onNavigateToSettings?.()
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add new user in Settings
                  </Button>
                </div>
              ) : (
                <div className="p-1">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        toggleUser(user.id)
                        setShowDropdown(false)
                        setSearchQuery("")
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <Avatar className="w-8 h-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Selected users ({selectedUsers.length})</p>
              <div className="space-y-2">
                {selectedUsers.map((userId) => {
                  const user = mockUsers.find((u) => u.id === userId)
                  if (!user) return null
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-md bg-accent">
                      <Avatar className="w-8 h-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => toggleUser(user.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-9 bg-transparent"
              onClick={() => {
                setSelectedUsers([])
                setSearchQuery("")
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1 h-9" disabled={selectedUsers.length === 0} onClick={handleShare}>
              Share with {selectedUsers.length} {selectedUsers.length === 1 ? "user" : "users"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
