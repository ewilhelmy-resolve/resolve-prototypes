import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldHelp } from "@/components/custom/FieldHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AgentGuardrailsSectionProps {
	guardrails: string[];
	onChange: (guardrails: string[]) => void;
}

export function AgentGuardrailsSection({
	guardrails,
	onChange,
}: AgentGuardrailsSectionProps) {
	const { t } = useTranslation("agents");

	return (
		<div className="space-y-2">
			<div>
				<div className="flex items-center gap-1.5">
					<p className="text-sm font-medium text-foreground">
						{t("builder.form.guardrailsLabel")}
					</p>
					<FieldHelp
						label={t("builder.form.guardrailsLabel")}
						description={t("builder.help.guardrails.description")}
						examples={
							t("builder.help.guardrails.examples", {
								returnObjects: true,
							}) as string[]
						}
						triggerAriaLabel={t("builder.helpTriggerAria")}
					/>
				</div>
				<p className="text-xs text-muted-foreground mt-0.5">
					{t("builder.form.guardrailsDescription")}
				</p>
			</div>

			{guardrails.length === 0 ? (
				<button
					onClick={() => onChange([...guardrails, ""])}
					className="w-full border border-dashed rounded-lg py-4 px-4 text-center hover:border-muted-foreground/50 transition-colors"
				>
					<p className="text-sm text-muted-foreground">
						{t("builder.form.addGuardrail")}
					</p>
				</button>
			) : (
				<div className="space-y-2">
					{guardrails.map((guardrail, index) => (
						<div key={index} className="flex items-center gap-2">
							<Input
								value={guardrail}
								onChange={(e) => {
									const updated = [...guardrails];
									updated[index] = e.target.value;
									onChange(updated);
								}}
								placeholder={t("builder.form.guardrailPlaceholder")}
								className="flex-1"
							/>
							<Button
								variant="ghost"
								size="icon"
								className="size-9 text-muted-foreground hover:text-foreground"
								onClick={() => {
									const updated = guardrails.filter((_, i) => i !== index);
									onChange(updated);
								}}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					))}
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-1.5 text-muted-foreground"
						onClick={() => onChange([...guardrails, ""])}
					>
						<Plus className="size-4" />
						{t("builder.form.addGuardrailButton")}
					</Button>
				</div>
			)}
		</div>
	);
}
