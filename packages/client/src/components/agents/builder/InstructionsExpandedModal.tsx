/**
 * InstructionsExpandedModal - Full-screen instructions editor
 */

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface InstructionsExpandedModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	value: string;
	onChange: (value: string) => void;
}

export function InstructionsExpandedModal({
	open,
	onOpenChange,
	value,
	onChange,
}: InstructionsExpandedModalProps) {
	const { t } = useTranslation("agents");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0"
				showCloseButton
			>
				<div className="flex-1 overflow-y-auto p-6">
					<Textarea
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={"## Role\n\n## Backstory\n\n## Goal\n\n## Task"}
						className="min-h-[400px] resize-none text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
					/>
				</div>
				<div className="flex items-center justify-between px-6 py-4 border-t">
					<p className="text-xs text-muted-foreground">
						{t("instructionsModal.hint")}
					</p>
					<Button size="sm" onClick={() => onOpenChange(false)}>
						{t("instructionsModal.done")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
