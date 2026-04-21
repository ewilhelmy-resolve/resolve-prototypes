import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldHelp } from "@/components/custom/FieldHelp";
import { Button } from "@/components/ui/button";

export interface AgentConversationStartersProps {
	starters: string[];
	onChange: (starters: string[]) => void;
	maxStarters: number;
	onGenerate: () => void;
	isGenerating: boolean;
	generateDisabled: boolean;
}

export function AgentConversationStarters({
	starters,
	onChange,
	maxStarters,
	onGenerate,
	isGenerating,
	generateDisabled,
}: AgentConversationStartersProps) {
	const { t } = useTranslation("agents");

	return (
		<div className="space-y-2">
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-1.5">
						<p className="text-sm font-medium text-foreground">
							{t("conversationStarters.label")}
						</p>
						<FieldHelp
							label={t("conversationStarters.label")}
							description={t("builder.help.conversationStarters.description")}
							examples={
								t("builder.help.conversationStarters.examples", {
									returnObjects: true,
								}) as string[]
							}
							triggerAriaLabel={t("builder.helpTriggerAria")}
						/>
					</div>
					<p className="text-sm text-muted-foreground mt-0.5">
						{t("conversationStarters.description")}
					</p>
				</div>
				{starters.length > 0 && (
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5 h-8 shrink-0"
						disabled={
							isGenerating || generateDisabled || starters.length >= maxStarters
						}
						onClick={onGenerate}
					>
						{isGenerating ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : (
							<Sparkles className="size-3.5" />
						)}
						{t("conversationStarters.regenerate")}
					</Button>
				)}
			</div>
			{starters.length === 0 ? (
				/* Empty state -- single Generate button */
				<Button
					variant="outline"
					className="w-fit"
					disabled={isGenerating || generateDisabled}
					onClick={onGenerate}
				>
					{isGenerating ? <Loader2 className="animate-spin" /> : <Plus />}
					{t("conversationStarters.generate")}
				</Button>
			) : (
				/* Populated state -- show chips + typing input */
				<div className="border rounded-md min-h-9 px-3 py-1.5 flex items-center gap-1 flex-wrap">
					{starters.map((starter, index) => (
						<div
							key={index}
							className="flex items-center gap-1 px-2 py-0.5 border border-dashed rounded-md text-xs text-muted-foreground whitespace-nowrap"
						>
							<span>{starter}</span>
							<button
								onClick={() => {
									const updated = starters.filter((_, i) => i !== index);
									onChange(updated);
								}}
								className="text-muted-foreground hover:text-destructive"
								aria-label={t("builder.form.removeStarter", {
									starter,
								})}
							>
								<X className="size-3" />
							</button>
						</div>
					))}
					{starters.length < maxStarters && (
						<input
							type="text"
							placeholder={t("conversationStarters.inputPlaceholder")}
							aria-label={t("conversationStarters.inputAriaLabel")}
							className="flex-1 min-w-[150px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
							onKeyDown={(e) => {
								const input = e.currentTarget;
								if (
									(e.key === "Enter" || e.key === ",") &&
									input.value.replace(",", "").trim()
								) {
									e.preventDefault();
									const values = input.value
										.split(",")
										.map((v) => v.trim())
										.filter(Boolean);

									const existing = starters;
									const availableSlots = maxStarters - existing.length;
									const newStarters = values
										.filter((v) => !existing.includes(v))
										.slice(0, availableSlots);
									if (newStarters.length > 0) {
										onChange([...existing, ...newStarters]);
									}
									input.value = "";
								}
							}}
						/>
					)}
				</div>
			)}
		</div>
	);
}
