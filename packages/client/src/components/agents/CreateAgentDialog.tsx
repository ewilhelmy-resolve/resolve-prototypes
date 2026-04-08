/**
 * CreateAgentDialog - Modal for creating a new agent
 *
 * Simple dialog with agent name input field.
 * Validates name uniqueness against the API with debounce.
 * Shows required/taken/available feedback inline.
 * On submit, navigates to the agent builder chat experience.
 */

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCheckAgentName } from "@/hooks/api/useAgents";
import { useDebounce } from "@/hooks/useDebounce";

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
	const [touched, setTouched] = useState(false);
	const debouncedName = useDebounce(agentName.trim(), 300);

	const { data: nameCheck, isFetching: isChecking } =
		useCheckAgentName(debouncedName);

	const isEmpty = touched && agentName.trim().length === 0;
	const nameTaken = nameCheck?.available === false;
	const nameAvailable =
		nameCheck?.available === true && debouncedName === agentName.trim();
	const canSubmit = agentName.trim().length > 0 && !isChecking && !nameTaken;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (canSubmit) {
			onCreateAgent(agentName.trim());
			setAgentName("");
			setTouched(false);
		}
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setAgentName("");
			setTouched(false);
		}
		onOpenChange(newOpen);
	};

	const hasError = isEmpty || nameTaken;

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
						<div className="relative mt-1.5">
							<Input
								id="agent-name"
								value={agentName}
								onChange={(e) => {
									setAgentName(e.target.value);
									if (!touched) setTouched(true);
								}}
								onBlur={() => setTouched(true)}
								placeholder="Enter agent name"
								autoFocus
								aria-invalid={hasError}
								aria-describedby="agent-name-feedback"
							/>
							{isChecking && agentName.trim() && (
								<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
							)}
						</div>
						<div
							id="agent-name-feedback"
							aria-live="polite"
							className="min-h-5 mt-1"
						>
							{isEmpty && (
								<p className="text-sm text-destructive">
									Agent name is required
								</p>
							)}
							{nameTaken && (
								<p className="text-sm text-destructive">
									An agent with this name already exists
								</p>
							)}
							{nameAvailable && !isEmpty && (
								<p className="text-sm text-emerald-600 flex items-center gap-1">
									<Check className="size-3.5" />
									Name is available
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!canSubmit}>
							Create agent
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
