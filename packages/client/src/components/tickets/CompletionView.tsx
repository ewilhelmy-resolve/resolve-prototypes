import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { useEffect, useRef } from "react";
import type { ReviewStats } from "./ReviewAIResponseSheet";

interface CompletionViewProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stats: ReviewStats;
	onEnableAutoRespond?: (stats: ReviewStats) => void;
	onKeepReviewing?: () => void;
}

/**
 * Completion screen shown after all tickets are reviewed
 * 
 * Features:
 * - Confetti celebration effect
 * - Review statistics display
 * - CTA for enabling Auto-Respond or continuing review
 * 
 * @component
 */
export function CompletionView({
	open,
	onOpenChange,
	stats,
	onEnableAutoRespond,
	onKeepReviewing,
}: CompletionViewProps) {
	const confettiRef = useRef<ConfettiRef>(null);

	// Fire confetti when completion screen shows
	useEffect(() => {
		if (open) {
 			// Small delay to ensure the component is fully mounted
			const timer = setTimeout(() => {
				if (confettiRef.current) {
					confettiRef.current.fire({
						particleCount: 100,
						spread: 70,
						origin: { x: 0.5, y: 0.6 },
					});
				}
			}, 300);

			return () => clearTimeout(timer);
		}
	}, [open]);

	const handleKeepReviewing = () => {
		onKeepReviewing?.();
		onOpenChange(false);
	};

	const handleEnableAutoRespond = () => {
		onEnableAutoRespond?.(stats);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="flex flex-col gap-6 sm:max-w-2xl w-full p-8"
				aria-describedby={undefined}
			>
				{/* Hidden but accessible header for screen readers */}
				<SheetHeader className="sr-only">
					<SheetTitle>Review Complete</SheetTitle>
				</SheetHeader>

				{/* Content */}
				<div className="flex-1 flex flex-col items-center justify-center gap-13 text-center relative">
					{/* Confetti Canvas */}
					<Confetti
						ref={confettiRef}
						className="absolute inset-0 w-full h-full pointer-events-none"
						manualstart
					/>

					{/* Title */}
					<h2 className="text-3xl mb-28 text-foreground">
						You reviewed {stats.totalReviewed} tickets
					</h2>

					{/* Confidence Improvement */}
					<div className="flex flex-col items-center gap-2">
						<p className="text-2xl font-serif">
							Confidence improved by
						</p>
						<p className="text-7xl font-serif font-bold text-foreground">
							{stats.confidenceImprovement}%
						</p>
					</div>

					{/* Stats */}
					<div className="flex items-center justify-center gap-6">
						<div className="flex items-center gap-1.5">
							<ThumbsDown className="size-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								Need improvement
							</span>
							<span className="text-sm font-semibold">
								{stats.needsImprovement}
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<ThumbsUp className="size-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">Trusted</span>
							<span className="text-sm font-semibold">
								{stats.trusted}
							</span>
						</div>
					</div>

					{/* CTA Message */}
					<p className="text-base font-serif">
						Ready to enable Auto-Respond for this ticket group?
					</p>
				</div>

				{/* Footer Actions */}
				<SheetFooter className="flex-row justify-end gap-2">
					<Button variant="outline" onClick={handleKeepReviewing}>
						Keep reviewing
					</Button>
					<Button onClick={handleEnableAutoRespond}>
						Enable Auto-Respond
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
