"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Copy } from "lucide-react"
import { useState } from "react"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareUrl?: string
}

export default function ShareDialog({ open, onOpenChange, shareUrl = "http://rita.resolve.io/invite/team-xyz-123" }: ShareDialogProps) {
  const [inputValue, setInputValue] = useState(shareUrl)

  const handleCopy = () => {
    navigator.clipboard.writeText(inputValue)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-background border border-border rounded-lg">
        <DialogHeader className="flex flex-col gap-1.5">
          <DialogTitle className="text-lg font-bold text-foreground text-left">
            Share Rita with Your Team
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-left leading-5">
            Invite your team members to use Rita for faster IT support and issue resolution. Share this link with anyone in your organization
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mt-3">
          <Input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 h-9 px-3 py-1 text-sm border border-input rounded-md shadow-sm"
            readOnly
          />
          <Button onClick={handleCopy} className="h-9 px-4 py-2 gap-2">
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  )
}
