/**
 * DropdownTestPage - Public test page to verify dropdown menu spacing fix
 *
 * This page demonstrates the dropdown menu component with proper spacing
 * between menu items. Used to verify the production build spacing issue is fixed.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

export default function DropdownTestPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Dropdown Menu Spacing Test</h1>
          <p className="text-muted-foreground">
            Click the buttons below to test dropdown menu spacing in production builds
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Test 1: Conversation Actions (Original Issue) */}
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Conversation Actions</h2>
            <p className="text-sm text-muted-foreground">
              This is the exact dropdown from the sidebar that had spacing issues
            </p>
            <div className="flex items-center justify-center py-8">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Test 2: Multiple Items */}
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Multiple Menu Items</h2>
            <p className="text-sm text-muted-foreground">
              Test with more items to verify consistent spacing
            </p>
            <div className="flex items-center justify-center py-8">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Open Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Item 1</DropdownMenuItem>
                  <DropdownMenuItem>Item 2</DropdownMenuItem>
                  <DropdownMenuItem>Item 3</DropdownMenuItem>
                  <DropdownMenuItem>Item 4</DropdownMenuItem>
                  <DropdownMenuItem>Item 5</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Test 3: Mixed Content */}
          <div className="border rounded-lg p-6 space-y-4 md:col-span-2">
            <h2 className="text-xl font-semibold">Mixed Content Items</h2>
            <p className="text-sm text-muted-foreground">
              Test with icons, text, and destructive variants
            </p>
            <div className="flex items-center justify-center py-8">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="border-t pt-8 space-y-4">
          <h3 className="text-lg font-semibold">Expected Behavior:</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Menu items should have visible spacing between them (4px / 0.25rem)</li>
            <li>Spacing should be consistent in both development and production builds</li>
            <li>Items should not appear squished or touching each other</li>
            <li>Hover states should be clearly visible with proper padding</li>
          </ul>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold mb-4">Fix Applied:</h3>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-mono">
              Added <code className="bg-background px-2 py-1 rounded">space-y-1</code> to DropdownMenuContent
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Location: <code className="text-xs">src/components/ui/dropdown-menu.tsx:45</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
