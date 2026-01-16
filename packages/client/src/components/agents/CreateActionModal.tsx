/**
 * CreateActionModal - Create a new workflow/action
 *
 * Features:
 * - Describe workflow with AI assistance
 * - Start from scratch option
 * - Pre-built example templates
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  ChevronRight,
  Calendar,
  Mail,
  KeyRound,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Example workflow templates
const WORKFLOW_EXAMPLES = [
  {
    id: "meeting-prep",
    name: "Prepare me for meetings",
    description:
      "Before each meeting, you'll receive a concise pre-read with key context from past meeting...",
    icon: Calendar,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    id: "email-replies",
    name: "Draft email replies",
    description:
      "Automatically looks at incoming emails and determines if they should be replied to. If so, ...",
    icon: Mail,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: "password-reset",
    name: "Password reset",
    description:
      "Verify user identity and reset their password in Active Directory...",
    icon: KeyRound,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "new-hire-onboarding",
    name: "New hire onboarding",
    description:
      "Provision accounts and access for new employees across all required systems...",
    icon: UserPlus,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
];

interface CreateActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAction: (action: { name: string; description: string }) => void;
}

export function CreateActionModal({
  open,
  onOpenChange,
  onCreateAction,
}: CreateActionModalProps) {
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!description.trim()) return;
    // For now, create action with the description as both name and description
    onCreateAction({
      name: description.slice(0, 50),
      description: description,
    });
    setDescription("");
    onOpenChange(false);
  };

  const handleSelectExample = (example: (typeof WORKFLOW_EXAMPLES)[0]) => {
    onCreateAction({
      name: example.name,
      description: example.description,
    });
    onOpenChange(false);
  };

  const handleStartFromScratch = () => {
    // Could navigate to a full workflow builder
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg">New workflow</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Describe workflow section */}
          <div className="text-center space-y-4">
            <h3 className="text-base font-medium">Describe your workflow</h3>
            <div className="relative">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Every time I receive an email, review the content and..."
                className="min-h-[80px] pr-12 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                size="icon"
                className="absolute bottom-2 right-2 size-8 rounded-full"
                onClick={handleSubmit}
                disabled={!description.trim()}
              >
                <Send className="size-4" />
              </Button>
            </div>

            <button
              onClick={handleStartFromScratch}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Start from scratch
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Examples section */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Start from an example</p>
            <div className="grid grid-cols-2 gap-3">
              {WORKFLOW_EXAMPLES.map((example) => {
                const Icon = example.icon;
                return (
                  <button
                    key={example.id}
                    onClick={() => handleSelectExample(example)}
                    className="flex items-start gap-3 p-3 text-left border rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "size-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        example.iconBg
                      )}
                    >
                      <Icon className={cn("size-5", example.iconColor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{example.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {example.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
