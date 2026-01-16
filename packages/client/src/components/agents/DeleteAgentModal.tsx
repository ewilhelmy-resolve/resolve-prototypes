/**
 * DeleteAgentModal - Confirmation modal for deleting agents
 *
 * Two tiers:
 * - Draft: Simple confirmation
 * - Published: Type-to-confirm with impact list
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentImpact {
  skills?: number;
  conversationStarters?: number;
  usersThisWeek?: number;
  linkedWorkflows?: string[];
}

interface DeleteAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  agentStatus: "draft" | "published";
  impact?: AgentImpact;
  onConfirmDelete: () => void;
}

export function DeleteAgentModal({
  open,
  onOpenChange,
  agentName,
  agentStatus,
  impact,
  onConfirmDelete,
}: DeleteAgentModalProps) {
  const [confirmText, setConfirmText] = useState("");

  const isPublished = agentStatus === "published";
  const canDelete = isPublished ? confirmText.toLowerCase() === "delete" : true;

  const handleDelete = () => {
    if (!canDelete) return;
    onConfirmDelete();
    onOpenChange(false);
    setConfirmText("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setConfirmText("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        onKeyDown={(e) => e.key === "Escape" && handleClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="size-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-red-100">
            <Trash2 className="size-6 text-red-600" />
          </div>
          <div className="flex-1 pt-1">
            <h2 className="text-lg font-semibold text-foreground">
              Delete "{agentName}"?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isPublished
                ? "This action cannot be undone."
                : "This draft agent will be permanently removed."}
            </p>
          </div>
        </div>

        {/* Impact section - only for published agents */}
        {isPublished && (
          <>
            {/* What will be removed */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">What will be removed:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  Agent configuration & instructions
                </li>
                {impact?.skills && impact.skills > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-muted-foreground" />
                    {impact.skills} connected skill{impact.skills > 1 ? "s" : ""}
                  </li>
                )}
                {impact?.conversationStarters && impact.conversationStarters > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-muted-foreground" />
                    {impact.conversationStarters} conversation starter{impact.conversationStarters > 1 ? "s" : ""}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  Usage history & analytics
                </li>
              </ul>
            </div>

            {/* Active dependencies warning */}
            {(impact?.usersThisWeek || impact?.linkedWorkflows?.length) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">Active dependencies:</p>
                </div>
                <ul className="text-sm text-amber-700 space-y-1 ml-6">
                  {impact.usersThisWeek && impact.usersThisWeek > 0 && (
                    <li>Used by {impact.usersThisWeek} employee{impact.usersThisWeek > 1 ? "s" : ""} this week</li>
                  )}
                  {impact.linkedWorkflows?.map((workflow) => (
                    <li key={workflow}>Linked to {workflow} workflow</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Type to confirm */}
            <div className="space-y-2">
              <label htmlFor="confirm-delete" className="text-sm text-muted-foreground">
                Type <span className="font-mono font-medium text-foreground">"delete"</span> to confirm
              </label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete}
            className={cn(!canDelete && "opacity-50 cursor-not-allowed")}
          >
            {isPublished ? "Delete agent" : "Delete draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}
