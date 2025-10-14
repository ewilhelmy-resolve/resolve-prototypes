import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, TrendingUp, ChevronDown, ArrowUpDown, Check, Zap, Loader, MoreHorizontal } from "lucide-react"

export default function KnowledgeArticles() {
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({
    selectAll: false,
    row1: false,
    row2: false,
    row3: false,
    row4: false,
    row5: false,
  })

  const handleCheckboxChange = (id: string) => {
    setCheckboxStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-6 py-6">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-normal text-foreground">Knowledge Articles</h1>
            </div>
            <div className="flex justify-end items-center">
              <Button onClick={() => console.log("Add Knowledge clicked")}>
                <Plus className="h-4 w-4" />
                Add Knowledge
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="container mx-auto">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-4 gap-4">
              <Card className="border border-border bg-popover shadow-sm">
                <CardContent className="p-3">
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

              <Card className="border border-border bg-popover shadow-sm">
                <CardContent className="p-3">
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

              <Card className="border border-border bg-popover shadow-sm">
                <CardContent className="p-3">
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

              <Card className="border border-border bg-popover shadow-sm">
                <CardContent className="p-3">
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

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <Input placeholder="Search knowledge....." className="max-w-sm" />
                <div className="flex items-center gap-4">
                  <Button variant="outline">
                    Source: All
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline">
                    Status: All
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 pl-3">
                        <Checkbox
                          checked={checkboxStates.selectAll}
                          onCheckedChange={() => handleCheckboxChange("selectAll")}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm">
                          Status
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm">
                          Source
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm">
                          Size
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm">
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
                      <TableCell className="pl-3">
                        <Checkbox checked={checkboxStates.row1} onCheckedChange={() => handleCheckboxChange("row1")} />
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
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-3">
                        <Checkbox checked={checkboxStates.row2} onCheckedChange={() => handleCheckboxChange("row2")} />
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
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-3">
                        <Checkbox checked={checkboxStates.row3} onCheckedChange={() => handleCheckboxChange("row3")} />
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
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-3">
                        <Checkbox checked={checkboxStates.row4} onCheckedChange={() => handleCheckboxChange("row4")} />
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
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-3">
                        <Checkbox checked={checkboxStates.row5} onCheckedChange={() => handleCheckboxChange("row5")} />
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
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-center items-center">
                <div className="flex justify-between items-center w-full">
                  <p className="text-sm text-muted-foreground">12 Knowledge articles</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled>
                      Previous
                    </Button>
                    <Button variant="outline" disabled>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
