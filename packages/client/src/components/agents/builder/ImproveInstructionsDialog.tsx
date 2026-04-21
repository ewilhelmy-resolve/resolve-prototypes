import { Loader2, XCircle } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ReasoningSteps } from "@/components/ai-elements/reasoning-steps";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useInstructionsImprovementStore } from "@/stores/instructionsImprovementStore";

/** Map step labels to ReasoningSteps icon/color directives */
const STEP_DIRECTIVE: Record<string, string> = {
	Starting: "[icon:zap,color:primary]",
	Processing: "[icon:workflow,color:primary]",
};

function buildReasoningContent(
	steps: { stepLabel: string; stepDetail: string }[],
): string {
	return steps
		.map((s) => {
			const prefix =
				STEP_DIRECTIVE[s.stepLabel] ?? "[icon:workflow,color:primary]";
			return `${prefix} ${s.stepLabel} — ${s.stepDetail}`;
		})
		.join("\n");
}

/**
 * Simple line-by-line diff: returns which lines changed in original (removed/changed)
 * and which lines changed in improved (added/changed). Like a git side-by-side diff.
 */
function getDiffLines(
	original: string,
	improved: string,
): { removedLines: Set<number>; addedLines: Set<number> } {
	const origLines = original.split("\n");
	const impLines = improved.split("\n");
	const removedLines = new Set<number>();
	const addedLines = new Set<number>();

	const maxLen = Math.max(origLines.length, impLines.length);
	for (let i = 0; i < maxLen; i++) {
		const origLine = i < origLines.length ? origLines[i] : undefined;
		const impLine = i < impLines.length ? impLines[i] : undefined;

		if (origLine !== impLine) {
			if (origLine !== undefined) removedLines.add(i);
			if (impLine !== undefined) addedLines.add(i);
		}
	}

	return { removedLines, addedLines };
}

interface ImproveInstructionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAcceptInstructions: (improved: string) => void;
	onRetry: () => void;
}

export function ImproveInstructionsDialog({
	open,
	onOpenChange,
	onAcceptInstructions,
	onRetry,
}: ImproveInstructionsDialogProps) {
	const { t } = useTranslation("agents");
	const {
		status,
		progressSteps,
		originalInstructions,
		improvedInstructions,
		error,
	} = useInstructionsImprovementStore();

	const reasoningContent = useMemo(
		() => buildReasoningContent(progressSteps),
		[progressSteps],
	);

	const { removedLines, addedLines } = useMemo(
		() => getDiffLines(originalInstructions || "", improvedInstructions || ""),
		[originalInstructions, improvedInstructions],
	);

	const handleAccept = useCallback(() => {
		if (improvedInstructions) {
			onAcceptInstructions(improvedInstructions);
			onOpenChange(false);
		}
	}, [improvedInstructions, onAcceptInstructions, onOpenChange]);

	const handleDiscard = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col p-0 gap-0">
				<DialogHeader className="px-6 pt-6 pb-4 shrink-0">
					<DialogTitle>{t("improveInstructions.title")}</DialogTitle>
					<DialogDescription>
						{t("improveInstructions.description")}
					</DialogDescription>
				</DialogHeader>

				{/* Loading state */}
				{status === "improving" && (
					<div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 px-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<h2 className="text-lg font-semibold">
								{t("improveInstructions.improving")}
							</h2>
							<p className="text-sm text-muted-foreground">
								{t("improveInstructions.improvingDescription")}
							</p>
						</div>

						{progressSteps.length === 0 && (
							<output aria-live="polite" aria-busy="true">
								<Loader2
									className="size-8 animate-spin text-primary"
									aria-hidden="true"
								/>
								<span className="sr-only">
									{t("improveInstructions.improving")}
								</span>
							</output>
						)}

						{progressSteps.length > 0 && (
							<output
								aria-live="polite"
								className="block w-full max-w-md bg-muted/30 rounded-lg p-4"
							>
								<ReasoningSteps content={reasoningContent} isStreaming={true} />
							</output>
						)}
					</div>
				)}

				{/* Error state */}
				{status === "error" && (
					<div
						role="alert"
						className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 px-6"
					>
						<XCircle className="size-14 text-destructive" aria-hidden="true" />
						<div className="flex flex-col items-center gap-2 text-center">
							<h2 className="text-lg font-semibold">
								{t("improveInstructions.failed")}
							</h2>
							<p className="text-sm text-muted-foreground max-w-sm">{error}</p>
						</div>
						<Button variant="outline" onClick={onRetry}>
							{t("improveInstructions.tryAgain")}
						</Button>
					</div>
				)}

				{/* Success state — side-by-side diff */}
				{status === "success" && (
					<div className="flex-1 min-h-0 px-6 pb-2">
						<div className="grid grid-cols-2 gap-4 h-full">
							{/* Current (left) */}
							<div className="flex flex-col gap-2 min-h-0">
								<p className="text-sm font-medium text-muted-foreground shrink-0">
									{t("improveInstructions.current")}
								</p>
								<div className="flex-1 bg-white border rounded-lg overflow-hidden min-h-0 dark:bg-gray-950">
									<ScrollArea className="h-full max-h-[calc(70vh-200px)]">
										<div className="px-4 py-3">
											{(originalInstructions || "")
												.split("\n")
												.map((line, i) => (
													<div
														key={i}
														className={cn(
															"text-sm leading-relaxed min-h-[1.5em] px-2",
															removedLines.has(i) &&
																"bg-red-50 dark:bg-red-950/30",
														)}
													>
														{line || "\u00A0"}
													</div>
												))}
										</div>
									</ScrollArea>
								</div>
							</div>

							{/* Improved (right) */}
							<div className="flex flex-col gap-2 min-h-0">
								<p className="text-sm font-medium text-muted-foreground shrink-0">
									{t("improveInstructions.improved")}
								</p>
								<div className="flex-1 bg-white border rounded-lg overflow-hidden min-h-0 dark:bg-gray-950">
									<ScrollArea className="h-full max-h-[calc(70vh-200px)]">
										<div className="px-4 py-3">
											{(improvedInstructions || "")
												.split("\n")
												.map((line, i) => (
													<div
														key={i}
														className={cn(
															"text-sm leading-relaxed min-h-[1.5em] px-2",
															addedLines.has(i) &&
																"bg-green-50 dark:bg-green-950/30",
														)}
													>
														{line || "\u00A0"}
													</div>
												))}
										</div>
									</ScrollArea>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Footer */}
				{status === "success" && (
					<DialogFooter className="px-6 py-4 border-t">
						<Button variant="outline" onClick={handleDiscard}>
							{t("improveInstructions.discard")}
						</Button>
						<Button onClick={handleAccept}>
							{t("improveInstructions.accept")}
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
