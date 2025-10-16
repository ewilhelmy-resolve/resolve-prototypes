/**
 * WelcomeDialog - Role-based welcome modal
 *
 * Displays personalized onboarding content based on user role:
 * - Admin/Owner: Steps to connect knowledge sources and invite teammates
 * - Regular User: Info about using RitaGo for IT support
 *
 * Integrates with:
 * - useProfile() for user name and role detection
 * - useProfilePermissions() for role-based rendering
 * - Feature flag SHOW_WELCOME_MODAL for display control
 */

"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProfile, useProfilePermissions } from "@/hooks/api/useProfile"
import { CheckCircle2, ExternalLink } from "lucide-react"

interface WelcomeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadFiles?: () => void
}

export default function WelcomeDialog({
  open,
  onOpenChange,
  onUploadFiles,
}: WelcomeDialogProps) {
  const { data: profile } = useProfile()
  const { isOwnerOrAdmin } = useProfilePermissions()

  // Get user's first name or fallback to "there"
  const firstName = profile?.user?.firstName || "there"
  const isAdmin = isOwnerOrAdmin()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-3xl font-semibold text-center">
            Welcome to RitaGo, {firstName}
          </DialogTitle>
          <DialogDescription className="text-base text-center leading-relaxed">
            Enjoy your free 90-day trial of Resolve's AI-powered agent for
            faster, smarter IT support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {isAdmin ? (
            // Admin Copy
            <>
              <div className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed">
                  RitaGo learns from your company's knowledge and tickets
                  (coming soon) to help resolve IT issues automatically. In a
                  few steps, you'll:
                </p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      Connect your knowledge sources like Confluence,
                      ServiceNow, or SharePoint.
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      Invite your teammates to start getting instant answers.
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      And coming soon — connect your ITSM for historical ticket
                      data to enrich your workspace and help users resolve
                      issues even faster.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => {
                    onUploadFiles?.()
                    onOpenChange(false)
                  }}
                  className="flex-1"
                >
                  Get Started
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    window.open(
                      "https://docs.resolve.com/ritago",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }}
                >
                  Learn how RitaGo works
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            // User Copy
            <>
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">
                  Your Admin has connected your workspace.
                </h3>

                <p className="text-sm text-foreground leading-relaxed">
                  RitaGo helps you solve IT issues instantly — from password
                  resets to VPN access — all based on your company's trusted
                  content. Just ask a question or describe the issue, and
                  RitaGo will:
                </p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Search verified knowledge</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Get easy next steps or fixes to issues, fast</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      Create a ticket if you still need help without overhead
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => {
                    onOpenChange(false)
                  }}
                  className="flex-1"
                >
                  Get Started
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    window.open(
                      "https://docs.resolve.com/ritago",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }}
                >
                  Learn how RitaGo works
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
