/**
 * SaveStatusIndicator - Visual feedback for auto-save status
 *
 * Shows: Draft → Saving... → Saved ✓ → Draft
 */

import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import type { SaveStatus } from "@/hooks/useAutoSave";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  isDirty: boolean;
  error?: string | null;
  className?: string;
}

export function SaveStatusIndicator({
  status,
  isDirty,
  error,
  className,
}: SaveStatusIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Loader2 className="size-3.5 animate-spin" />,
          text: "Saving...",
          className: "text-muted-foreground",
        };
      case "saved":
        return {
          icon: <Check className="size-3.5" />,
          text: "Saved",
          className: "text-emerald-600",
        };
      case "error":
        return {
          icon: <CloudOff className="size-3.5" />,
          text: error || "Failed to save",
          className: "text-destructive",
        };
      default:
        // idle
        return {
          icon: <Cloud className="size-3.5" />,
          text: isDirty ? "Unsaved changes" : "Draft",
          className: isDirty ? "text-amber-600" : "text-muted-foreground",
        };
    }
  };

  const { icon, text, className: statusClassName } = getStatusDisplay();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium transition-colors",
        statusClassName,
        className
      )}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}
