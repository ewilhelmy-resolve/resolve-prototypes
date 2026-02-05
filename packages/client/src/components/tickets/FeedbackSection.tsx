import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";

interface FeedbackSectionProps {
	show: boolean;
	onSubmit: (reasons: string[], feedback: string) => void;
	onCancel: () => void;
}

const FEEDBACK_REASON_KEYS = [
	"missingInfo",
	"wrongTone",
	"incorrectSolution",
	"tooGeneric",
] as const;

/**
 * Floating feedback section for collecting user feedback on AI responses
 * 
 * Features:
 * - Multiple reason selection (optional)
 * - Required text feedback
 * - Animated entrance/exit
 * - Floating overlay positioning
 * 
 * @component
 */
export function FeedbackSection({ show, onSubmit, onCancel }: FeedbackSectionProps) {
	const { t } = useTranslation("tickets");
	const [feedbackReasons, setFeedbackReasons] = useState<string[]>([]);
	const [feedbackText, setFeedbackText] = useState("");

	const handleToggleReason = (reason: string) => {
		setFeedbackReasons((prev) =>
			prev.includes(reason)
				? prev.filter((r) => r !== reason)
				: [...prev, reason]
		);
	};

	const handleSubmit = () => {
		if (!feedbackText.trim()) return;
		
		onSubmit(feedbackReasons, feedbackText);
		
		// Reset state
		setFeedbackReasons([]);
		setFeedbackText("");
	};

	const handleCancel = () => {
		onCancel();
		
		// Reset state
		setFeedbackReasons([]);
		setFeedbackText("");
	};

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.2 }}
					className="absolute bg-gray-50 bottom-0 left-0 right-0 p-8 border-t shadow-2xl z-50"
				>
					<div className="flex flex-col gap-4">
						<p className="text-sm font-medium">{t("feedback.title")}</p>

						<div className="flex flex-wrap gap-2">
							{FEEDBACK_REASON_KEYS.map((reasonKey) => {
								const reason = t(`feedback.reasons.${reasonKey}`);
								return (
									<Badge
										key={reasonKey}
										variant={feedbackReasons.includes(reason) ? "default" : "outline"}
										onClick={() => handleToggleReason(reason)}
										className={cn(
											"cursor-pointer transition-colors hover:bg-accent",
											feedbackReasons.includes(reason) && "bg-primary text-primary-foreground hover:bg-primary/90"
										)}
									>
										{reason}
									</Badge>
								);
							})}
						</div>

						<div className="flex flex-col gap-2">
							<label htmlFor="feedback-text" className="text-sm font-medium">
								{t("feedback.enterFeedback")}
							</label>
							<textarea
								id="feedback-text"
								value={feedbackText}
								onChange={(e) => setFeedbackText(e.target.value)}
								placeholder={t("feedback.placeholder")}
								className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCancel}
							>
								{t("feedback.skip")}
							</Button>
							<Button
								size="sm"
								onClick={handleSubmit}
								disabled={!feedbackText.trim()}
							>
								{t("feedback.submit")}
							</Button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
