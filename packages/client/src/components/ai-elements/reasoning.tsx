/**
 * Reasoning accordion — displays "Thinking..." workflow progress in an expandable panel.
 *
 * Driven by SSE messages with `metadata.reasoning`. Each message's `reasoning.content`
 * is a single step line. Consecutive reasoning messages are merged by the store into
 * one newline-separated string rendered as structured steps.
 *
 * @view Reasoning
 * @journey send-chat-message
 * @constraint Actions Platform must send `turn_complete: false` on each reasoning message
 *
 * ## SSE Contract (for Actions Platform developers)
 *
 * Send each workflow step as a separate SSE `new_message` event:
 *
 * ```json
 * {
 *   "metadata": {
 *     "reasoning": {
 *       "content": "Requirements Analyst is working...",
 *       "title": "Thinking..."
 *     },
 *     "turn_complete": false
 *   }
 * }
 * ```
 *
 * ### Step text patterns → UI icons
 *
 * | Pattern in text | Icon | Example |
 * |----------------|------|---------|
 * | "is working", "analyst", "developer" | Bot | "Requirements Analyst is working..." |
 * | "verifying", "checking", "searching" | Search | "Verifying if activity exists" |
 * | "generate", "code", "build" | Code | "Using generate_python_code..." |
 * | "starting", "running", "trigger" | Zap | "Starting agent" |
 * | "polling", "execution status" | Workflow | "Polling for status updates" |
 *
 * ### Automatic behaviors (no API changes needed)
 *
 * - Duplicate consecutive lines collapsed with ×N badge
 * - UUIDs in parentheses hidden from display (visible on hover)
 * - Active step (last line while streaming) shows spinner
 * - Accordion auto-closes 2s after streaming ends
 * - Custom title via `reasoning.title` (default: "Thinking...")
 *
 * @see packages/client/docs/THINKING_MESSAGES_GUIDE.md for full integration guide
 */
"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {  ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, memo, useContext, useEffect, useState } from "react";
import { ReasoningSteps } from "./reasoning-steps";
import { Response } from "./response";
import { Clock } from "../animate-ui/icons/clock";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 2000;
const MS_IN_S = 1000;

/**
 * Collapsible "Thinking..." accordion for workflow progress.
 * Driven by SSE metadata.reasoning — shows structured steps with icons, dedup, and auto-close.
 * Actions Platform sends each step as a separate SSE new_message with reasoning.content.
 * @see packages/client/docs/THINKING_MESSAGES_GUIDE.md
 */
export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpenState] = useState(open ?? defaultOpen);
    const [duration, setDuration] = useState(durationProp ?? 0);

    // Sync with controlled prop if provided
    useEffect(() => {
      if (open !== undefined) setIsOpenState(open);
    }, [open]);
    useEffect(() => {
      if (durationProp !== undefined) setDuration(durationProp);
    }, [durationProp]);

    const setIsOpen = (newOpen: boolean) => {
      setIsOpenState(newOpen);
      onOpenChange?.(newOpen);
    };

    const [hasAutoClosed, setHasAutoClosed] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } else if (startTime !== null) {
        setDuration(Math.ceil((Date.now() - startTime) / MS_IN_S));
        setStartTime(null);
      }
    }, [isStreaming, startTime, setDuration]);

    // Auto-close when streaming ends (once only, skip if user manually toggled)
    useEffect(() => {
      if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed && !userInteracted) {
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosed(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosed, userInteracted]);

    const handleOpenChange = (newOpen: boolean) => {
      setUserInteracted(true);
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title?: string;
};

const getThinkingMessage = (isStreaming: boolean, duration?: number, customTitle?: string) => {
  // If custom title is provided, use it
  if (customTitle) {
    return <p>{customTitle}</p>;
  }

  // Otherwise use default messages based on state
  if (isStreaming || duration === 0) {
    return <p>Thinking...</p>;
  }
  if (duration === undefined) {
    return <p>Thought for a few seconds</p>;
  }
  return <p>Thought for {duration} seconds</p>;
};

/**
 * Trigger button for the Reasoning accordion. Shows animated clock while streaming,
 * chevron for expand/collapse, and duration after completion.
 * Custom title via `title` prop (default: "Thinking..." / "Thought for N seconds").
 */
export const ReasoningTrigger = memo(
  ({ className, title, children, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <Clock animate={isStreaming ? "default" : false} loop={isStreaming} className="size-4" />
            {getThinkingMessage(isStreaming, duration, title)}
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

/**
 * Content area for the Reasoning accordion.
 * Multi-line content (workflow steps) renders via ReasoningSteps with icons, dedup, and UUID hiding.
 * Single-line content renders as markdown via Response.
 */
export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const { isStreaming } = useReasoning();

    // Use structured step renderer for multi-line reasoning (workflow status updates)
    const hasMultipleLines = children.includes("\n") && children.split("\n").filter(Boolean).length > 1;

    return (
      <CollapsibleContent
        className={cn(
          "mt-4 text-sm",
          "data-[ending-style]:fade-out-0 data-[ending-style]:slide-out-to-top-2 data-[open]:slide-in-from-top-2 text-muted-foreground outline-none data-[ending-style]:animate-out data-[ending-style]:duration-500 data-[open]:animate-in data-[open]:duration-300",
          className
        )}
        {...props}
      >
        {hasMultipleLines ? (
          <ReasoningSteps content={children} isStreaming={isStreaming} />
        ) : (
          <Response className="grid gap-2">{children}</Response>
        )}
      </CollapsibleContent>
    );
  }
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
