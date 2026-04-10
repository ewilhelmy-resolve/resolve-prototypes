/**
 * CreateWorkflowModal - Create new workflow with AI (v3/Jarvis placeholder)
 */

import { Calendar, ChevronDown, Key, Mail, Send, Users, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface CreateWorkflowModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const WORKFLOW_TEMPLATES = [
	{
		id: "meeting-prep",
		title: "Prepare me for meetings",
		description:
			"Before each meeting, you'll receive a concise pre-read with key context from past meeting...",
		prompt:
			"Before each meeting, prepare a concise pre-read with key context from past meetings",
		icon: Calendar,
		iconBg: "bg-purple-100",
		iconColor: "text-purple-600",
	},
	{
		id: "email-replies",
		title: "Draft email replies",
		description:
			"Automatically looks at incoming emails and determines if they should be replied to. If so, ...",
		prompt:
			"Automatically look at incoming emails and determine if they should be replied to",
		icon: Mail,
		iconBg: "bg-rose-100",
		iconColor: "text-rose-500",
	},
	{
		id: "password-reset",
		title: "Password reset",
		description:
			"Verify user identity and reset their password in Active Directory...",
		prompt:
			"Reset a user's password in Active Directory after verifying their identity",
		icon: Key,
		iconBg: "bg-blue-100",
		iconColor: "text-blue-600",
	},
	{
		id: "new-hire",
		title: "New hire onboarding",
		description:
			"Provision accounts and access for new employees across all required systems...",
		prompt: "Provision new hire accounts across all required systems",
		icon: Users,
		iconBg: "bg-emerald-100",
		iconColor: "text-emerald-600",
	},
];

export function CreateWorkflowModal({
	open,
	onOpenChange,
}: CreateWorkflowModalProps) {
	const [description, setDescription] = useState("");

	const handleClose = () => {
		onOpenChange(false);
		setDescription("");
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b">
					<h2 className="text-lg font-medium">New workflow</h2>
					<button
						type="button"
						onClick={handleClose}
						className="text-muted-foreground hover:text-foreground"
						aria-label="Close"
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Chat input area */}
					<div className="bg-muted/30 rounded-xl p-8 min-h-[200px] flex flex-col items-center justify-center">
						<h3 className="text-xl font-medium mb-4">Describe your workflow</h3>
						<div className="w-full max-w-lg relative">
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Every time I receive an email, review the content and..."
								className="min-h-[80px] resize-none pr-12"
							/>
							<button
								type="button"
								className="absolute right-3 bottom-3 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
								disabled={!description.trim()}
								onClick={() => {
									toast.info("Workflow creation with AI coming in v3");
								}}
							>
								<Send className="size-4" />
							</button>
						</div>
						<button
							type="button"
							className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
							onClick={() => {
								toast.info("Start from scratch coming in v3");
							}}
						>
							Start from scratch
							<ChevronDown className="size-4 -rotate-90" />
						</button>
					</div>

					{/* Example templates */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-muted-foreground">
							Start from an example
						</h4>
						<div className="grid grid-cols-2 gap-3">
							{WORKFLOW_TEMPLATES.map((template) => {
								const TemplateIcon = template.icon;
								return (
									<button
										key={template.id}
										type="button"
										className="flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-muted/50 transition-colors"
										onClick={() => setDescription(template.prompt)}
									>
										<div
											className={`size-10 rounded-lg ${template.iconBg} flex items-center justify-center flex-shrink-0`}
										>
											<TemplateIcon
												className={`size-5 ${template.iconColor}`}
											/>
										</div>
										<div>
											<p className="text-sm font-medium">{template.title}</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												{template.description}
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
