"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, TrendingUp, ChevronDown, ArrowUpDown, Zap, Check, Loader, MoreHorizontal } from "lucide-react"

export default function KnowledgeArticlesDashboard() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedRows(prev => 
      prev.length === 5 ? [] : ['1', '2', '3', '4', '5']
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2.5 px-6 py-6 border-b border-border flex-shrink-0">
        <div className="flex justify-between items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-normal text-foreground">Knowledge Articles</h1>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={() => console.log('Add Articles')}>
              <Plus className="h-4 w-4" />
              Add Articles
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6 py-6 w-full flex-1">
        <div className="flex gap-2.5 lg:grid lg:grid-cols-4 lg:gap-2.5">
          <Card className="bg-popover border border-border">
            <CardContent className="p-4">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-normal text-foreground">12</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +4.5%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-popover border border-border">
            <CardContent className="p-4">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-normal text-foreground">9</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +4.5%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Total Vectors</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-popover border border-border">
            <CardContent className="p-4">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-normal text-foreground">30</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +5%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Queries answered</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-popover border border-border">
            <CardContent className="p-4">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-normal text-foreground">30</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +5%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Avg . Accuracy</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 py-4">
            <Input 
              placeholder="Search documents....." 
              className="max-w-sm"
            />
            <div className="flex gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Source: All
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>All Sources</DropdownMenuItem>
                  <DropdownMenuItem>Jira Confluence</DropdownMenuItem>
                  <DropdownMenuItem>Manual</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Status: All
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>All Status</DropdownMenuItem>
                  <DropdownMenuItem>Active</DropdownMenuItem>
                  <DropdownMenuItem>Pending</DropdownMenuItem>
                  <DropdownMenuItem>Syncing</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox 
                      checked={selectedRows.length === 5}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Status
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Source
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Size
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Queries
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Created Modified</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Checkbox 
                      checked={selectedRows.includes('1')}
                      onCheckedChange={() => handleRowSelect('1')}
                    />
                  </TableCell>
                  <TableCell>Password Reset</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Zap className="h-3 w-3" />
                      Syncing
                    </Badge>
                  </TableCell>
                  <TableCell>Jira Confluence</TableCell>
                  <TableCell className="text-right">123 MB</TableCell>
                  <TableCell className="text-right">12</TableCell>
                  <TableCell className="text-right">03 Sep, 2025 18:07</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Checkbox 
                      checked={selectedRows.includes('2')}
                      onCheckedChange={() => handleRowSelect('2')}
                    />
                  </TableCell>
                  <TableCell>VPN Connection Troubleshooting</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Check className="h-3 w-3" />
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>Manual</TableCell>
                  <TableCell className="text-right">123 MB</TableCell>
                  <TableCell className="text-right">4</TableCell>
                  <TableCell className="text-right">03 Sep, 2025 18:07</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Checkbox 
                      checked={selectedRows.includes('3')}
                      onCheckedChange={() => handleRowSelect('3')}
                    />
                  </TableCell>
                  <TableCell>Two-factor authentication setup</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Loader className="h-3 w-3" />
                      Pending
                    </Badge>
                  </TableCell>
                  <TableCell>Manual</TableCell>
                  <TableCell className="text-right">123 MB</TableCell>
                  <TableCell className="text-right">1</TableCell>
                  <TableCell className="text-right">03 Sep, 2025 18:07</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Checkbox 
                      checked={selectedRows.includes('4')}
                      onCheckedChange={() => handleRowSelect('4')}
                    />
                  </TableCell>
                  <TableCell>Phishing awareness guide</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Check className="h-3 w-3" />
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>Manual</TableCell>
                  <TableCell className="text-right">123 MB</TableCell>
                  <TableCell className="text-right">43</TableCell>
                  <TableCell className="text-right">03 Sep, 2025 18:07</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Checkbox 
                      checked={selectedRows.includes('5')}
                      onCheckedChange={() => handleRowSelect('5')}
                    />
                  </TableCell>
                  <TableCell>Email Configuration Setup</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Loader className="h-3 w-3" />
                      Pending
                    </Badge>
                  </TableCell>
                  <TableCell>Manual</TableCell>
                  <TableCell className="text-right">123 MB</TableCell>
                  <TableCell className="text-right">21</TableCell>
                  <TableCell className="text-right">03 Sep, 2025 18:07</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-center py-4">
            <p className="text-sm text-muted-foreground">12 Knowledge articles</p>
          </div>
        </div>
      </div>
    </div>
  )
}
