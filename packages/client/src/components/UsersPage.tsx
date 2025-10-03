"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, TrendingUp, Check, Loader, ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

export default function UsersPage() {
  const [selectedRows, setSelectedRows] = useState<boolean[]>([false, false, false, false, false])

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(new Array(5).fill(checked))
  }

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelectedRows = [...selectedRows]
    newSelectedRows[index] = checked
    setSelectedRows(newSelectedRows)
  }

  const users = [
    { name: "Jordan Smith", status: "Active", role: "Admin", queries: "12", lastModified: "03 Sep, 2025 18:07" },
    { name: "Taylor Brown", status: "Active", role: "Content Admin", queries: "4", lastModified: "03 Sep, 2025 18:07" },
    { name: "Morgan Lee", status: "Invite pending", role: "User", queries: "1", lastModified: "03 Sep, 2025 18:07" },
    { name: "Riley Green", status: "Active", role: "User", queries: "43", lastModified: "03 Sep, 2025 18:07" },
    { name: "Casey White", status: "Invite pending", role: "User", queries: "21", lastModified: "03 Sep, 2025 18:07" }
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col gap-2.5 p-4 border-b border-border">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-normal text-foreground">Users</h1>
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={() => console.log("Add Users clicked")}>
                <Plus className="h-4 w-4" />
                Add Users
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 max-w-7xl mx-auto w-full">
        <div className="flex gap-2.5 lg:gap-10">
          <Card className="bg-popover border border-border rounded-md shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-normal text-foreground">5</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +4.5%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-popover border border-border rounded-md shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-normal text-foreground">9</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +4.5%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Avg . Active Users</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-popover border border-border rounded-md shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-normal text-foreground">30</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +5%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Invited Users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col">
          <div className="flex justify-between items-center gap-2 py-4">
            <Input 
              placeholder="Search documents....." 
              className="max-w-sm"
            />
            <div className="flex gap-4 items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Status: All
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>All</DropdownMenuItem>
                  <DropdownMenuItem>Active</DropdownMenuItem>
                  <DropdownMenuItem>Invite pending</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox 
                      checked={selectedRows.every(Boolean)}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>
                    <Button variant="ghost" className="flex items-center gap-2">
                      Status
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="flex items-center gap-2">
                      Roles
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="flex items-center gap-2">
                      Queries
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Last Modified</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedRows[index]}
                        onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {user.status === "Active" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Loader className="h-3 w-3" />
                        )}
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{user.queries}</TableCell>
                    <TableCell className="text-right">{user.lastModified}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-center py-4">
            <p className="text-sm text-muted-foreground">5 Users</p>
          </div>
        </div>
      </div>
    </div>
  )
}
