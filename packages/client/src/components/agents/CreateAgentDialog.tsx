/**
 * CreateAgentDialog - Modal for creating a new agent
 *
 * Simple dialog with agent name input field.
 * On submit, navigates to the agent builder chat experience.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAgent: (name: string) => void;
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onCreateAgent,
}: CreateAgentDialogProps) {
  const [agentName, setAgentName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agentName.trim()) {
      onCreateAgent(agentName.trim());
      setAgentName("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAgentName("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create agent</DialogTitle>
            <DialogDescription>
              Create a new agent to assist your team
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="agent-name" className="text-sm font-medium">
              Name of agent
            </Label>
            <Input
              id="agent-name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!agentName.trim()}>
              Create agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
