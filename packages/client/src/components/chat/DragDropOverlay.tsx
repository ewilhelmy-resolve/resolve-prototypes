/**
 * DragDropOverlay - Visual feedback for file drag-and-drop
 *
 * Provides an attractive overlay when users drag files over the chat area.
 * Implements UX best practices:
 * - Clear visual indication of drop zone
 * - Animated entry/exit
 * - "Magnetic" feel as files approach
 * - Accessible with proper ARIA labels
 */

import { FileIcon, UploadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export interface DragDropOverlayProps {
  isDragging: boolean
  accept?: string
  maxFiles?: number
  maxFileSize?: number
}

export function DragDropOverlay({
  isDragging,
  accept,
  maxFiles,
  maxFileSize
}: DragDropOverlayProps) {
  const { t } = useTranslation("chat")
  if (!isDragging) return null

  const formatMaxSize = (bytes?: number) => {
    if (!bytes) return null
    const mb = bytes / 1024 / 1024
    return `${Math.round(mb)}MB max`
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-background/95 backdrop-blur-sm",
        "animate-in fade-in duration-200"
      )}
      role="region"
      aria-label="File drop zone"
    >
      <div
        className={cn(
          "relative flex flex-col items-center justify-center",
          "w-full max-w-2xl mx-4 p-12",
          "border-2 border-dashed border-primary rounded-xl",
          "bg-primary/5",
          "animate-in zoom-in-95 duration-200",
          "transition-all"
        )}
      >
        {/* Icon with magnetic pulse effect */}
        <div className={cn(
          "relative mb-6",
          "animate-in zoom-in-50 duration-300"
        )}>
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className="w-24 h-24 rounded-full bg-primary" />
          </div>
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border-2 border-primary">
            <UploadIcon className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Main message */}
        <h3 className="text-2xl font-semibold text-foreground mb-2">
          {t("dragDrop.title")}
        </h3>

        <p className="text-muted-foreground text-center max-w-md">
          {t("dragDrop.description")}
        </p>

        {/* File constraints */}
        {(accept || maxFiles || maxFileSize) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            {accept && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/50 border border-border">
                <FileIcon className="w-3.5 h-3.5" />
                <span>{t("dragDrop.supportedFiles")}</span>
              </div>
            )}
            {maxFiles && (
              <div className="px-3 py-1.5 rounded-full bg-background/50 border border-border">
                {t("dragDrop.maxFiles", { count: maxFiles })}
              </div>
            )}
            {maxFileSize && (
              <div className="px-3 py-1.5 rounded-full bg-background/50 border border-border">
                {formatMaxSize(maxFileSize)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
