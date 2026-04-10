import { ThumbsDown, ThumbsUp } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { Confetti, type ConfettiRef } from "@/components/custom/confetti";
import { cn } from "@/lib/utils";
import { ProTipBadge } from "./ProTipBadge";

export interface ReviewCompletionStatsRef {
	fireConfetti: () => void;
}

interface ReviewCompletionStatsProps {
	/** Icon emoji displayed at top */
	icon: string;
	/** Main title text */
	title: string;
	/** Subtitle/description text */
	subtitle: string;
	/** Number of trusted responses */
	trusted: number;
	/** Total number of responses reviewed */
	totalReviewed: number;
	/** Number of responses needing improvement */
	needsImprovement: number;
	/** Bottom message text */
	message?: string;
	/** Pro-tip text (shown in highlighted box) */
	proTip?: string;
	/** Show confetti animation */
	showConfetti?: boolean;
	/** Optional className for the container */
	className?: string;
}

/**
 * ReviewCompletionStats - Displays review session completion statistics
 *
 * Shows:
 * - Icon emoji at top
 * - Title and subtitle
 * - Trusted responses ratio (X / Y)
 * - Thumbs up/down breakdown
 * - Optional message and pro-tip
 * - Optional confetti celebration
 *
 * Use ref.fireConfetti() to trigger the confetti animation
 *
 * @component
 */
export const ReviewCompletionStats = forwardRef<
	ReviewCompletionStatsRef,
	ReviewCompletionStatsProps
>(function ReviewCompletionStats(
	{
		icon,
		title,
		subtitle,
		trusted,
		totalReviewed,
		needsImprovement,
		message,
		proTip,
		showConfetti = false,
		className,
	},
	ref,
) {
	const { t } = useTranslation("tickets");
	const confettiRef = useRef<ConfettiRef>(null);

	const fireConfetti = useCallback(() => {
		confettiRef.current?.fire({
			particleCount: 100,
			spread: 70,
			origin: { x: 0.5, y: 0.6 },
		});
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			fireConfetti,
		}),
		[fireConfetti],
	);

	// Auto-fire confetti on mount when showConfetti is true
	useEffect(() => {
		if (showConfetti) {
			const timer = setTimeout(fireConfetti, 300);
			return () => clearTimeout(timer);
		}
	}, [showConfetti, fireConfetti]);

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-6 text-center relative",
				className,
			)}
		>
			{/* Confetti Canvas */}
			{showConfetti && (
				<Confetti
					ref={confettiRef}
					className="absolute inset-0 w-full h-full pointer-events-none"
					manualstart
				/>
			)}

			{/* Icon + Title + Subtitle */}
			<div className="flex flex-col items-center gap-2">
				<span className="text-4xl">{icon}</span>
				<h2 className="text-2xl font-serif text-foreground">{title}</h2>
				<p className="text-sm text-muted-foreground max-w-sm">{subtitle}</p>
			</div>

			{/* Trusted Responses Ratio */}
			<div className="flex flex-col items-center gap-1 py-8">
				<p className="text-7xl font-serif font-light text-foreground">
					{trusted} / {totalReviewed}
				</p>
				<p className="text-sm text-muted-foreground">
					{t("completion.stats.trustedResponses")}
				</p>
			</div>

			{/* Stats Row */}
			<div className="flex items-center justify-center gap-6">
				<div className="flex items-center gap-1.5">
					<ThumbsDown className="size-4 text-destructive" />
					<span className="text-sm text-muted-foreground">
						{t("completion.stats.needImprovement")}
					</span>
					<span className="text-sm font-semibold">{needsImprovement}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<ThumbsUp className="size-4 text-emerald-500" />
					<span className="text-sm text-muted-foreground">
						{t("completion.stats.trusted")}
					</span>
					<span className="text-sm font-semibold">{trusted}</span>
				</div>
			</div>

			{/* Message + Pro-tip */}
			{(message || proTip) && (
				<div className="flex flex-col items-center gap-3 mt-2">
					{message && <p className="text-sm text-foreground">{message}</p>}
					{proTip && <ProTipBadge>{proTip}</ProTipBadge>}
				</div>
			)}
		</div>
	);
});
