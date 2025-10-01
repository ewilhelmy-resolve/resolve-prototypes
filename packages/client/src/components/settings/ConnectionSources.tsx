"use client"

import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CONNECTION_SOURCES } from "@/constants/connectionSources"
import { ConnectionStatusBadge } from "./ConnectionStatusBadge"

export default function ConnectionSources() {
  return (
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-medium text-foreground">Connection Sources</h3>
          <p className="text-sm text-muted-foreground">
            Connect your knowledge and ticketing sources to help Rita resolve IT issues faster.
          </p>
        </div>
        <Separator />
        <div className="flex flex-col gap-6">
          {CONNECTION_SOURCES.map((source) => (
            <Link key={source.id} to={`/settings/connections/${source.id}`} className="block">
              <Card className="p-4 border border-border bg-popover hover:bg-accent transition-colors cursor-pointer">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                      <p className="text-base font-bold text-foreground">{source.title}</p>
                      {source.lastSync && (
                        <p className="text-sm text-foreground">Last sync: {source.lastSync}</p>
                      )}
                      {source.description && (
                        <p className="text-sm text-foreground">{source.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {source.badges.map((badge) => (
                        <Badge key={badge} variant="secondary">{badge}</Badge>
                      ))}
                    </div>
                  </div>
                  <ConnectionStatusBadge status={source.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
  )
}