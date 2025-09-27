"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function ConnectionSources() {
  return (
    <div className="container mx-auto p-6 flex flex-col items-center gap-8">
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-medium text-foreground">Connection Sources</h3>
          <p className="text-sm text-muted-foreground">
            Connect your knowledge and ticketing sources to help Rita resolve IT issues faster.
          </p>
        </div>

        <Separator />

        <div className="flex flex-col gap-6">
          <Card className="p-4 border border-border bg-popover">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <p className="text-base font-bold text-foreground">Atlassian Confluence</p>
                  <p className="text-sm text-foreground">Status: Not connected</p>
                  <p className="text-sm text-foreground">Last sync: —</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Knowledge</Badge>
                </div>
              </div>
              <Button variant="secondary">Connect</Button>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-popover">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <p className="text-base font-bold text-foreground">Microsoft SharePoint</p>
                  <p className="text-sm text-foreground">Status: Not connected</p>
                  <p className="text-sm text-foreground">Last sync: —</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Knowledge</Badge>
                </div>
              </div>
              <Button variant="secondary">Connect</Button>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-popover">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <p className="text-base font-bold text-foreground">ServiceNow</p>
                  <p className="text-sm text-foreground">Status: Not connected</p>
                  <p className="text-sm text-foreground">Last sync: —</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Knowledge</Badge>
                  <Badge variant="secondary">Ticketing</Badge>
                </div>
              </div>
              <Button variant="secondary">Connect</Button>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-popover">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <p className="text-base font-bold text-foreground">Web Search (LGA)</p>
                  <p className="text-sm text-foreground">Status: Enabled</p>
                  <p className="text-sm text-foreground">Use web results to supplement answers when knowledge isn't found.</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Knowledge</Badge>
                </div>
              </div>
              <Button variant="secondary">Enabled</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}