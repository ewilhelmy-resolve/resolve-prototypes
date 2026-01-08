import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ValidationConfidenceCardProps {
	/** Number of validated items */
	validated?: number;
	/** Total items to validate */
	total?: number;
	/** Optional className for the container */
	className?: string;
}

/**
 * ValidationConfidenceCard - Progress card showing validation confidence
 *
 * Displays:
 * - Header with title and info icon
 * - Dynamic description based on progress
 * - Progress bar
 * - Validated count (e.g., "Validated 5/16")
 *
 * @component
 */
export function ValidationConfidenceCard({
	validated = 0,
	total = 16,
	className,
}: ValidationConfidenceCardProps) {
	const progressValue = total > 0 ? (validated / total) * 100 : 0;

	const getDescription = () => {
		if (validated === 0) {
			return "Just getting started! Start validating towards automating";
		}
		if (validated < total * 0.5) {
			return "Making progress! Keep validating to improve automation";
		}
		if (validated < total) {
			return "Almost there! A few more validations to go";
		}
		return "All validated! Ready for full automation";
	};

	return (
		<div className={className}>
			<div className="rounded-lg border bg-background p-3">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<h3 className="font-semibold">Validation Confidence</h3>
						<Info className="h-4 w-4" />
					</div>
					<p className="text-sm text-muted-foreground">{getDescription()}</p>
					<Progress value={progressValue} className="mt-2" />
					<p className="mt-2 text-sm">
						Validated {validated}/{total}
					</p>
				</div>
			</div>
		</div>
	);
}
