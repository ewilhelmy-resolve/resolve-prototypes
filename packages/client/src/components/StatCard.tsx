import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
	/** The main numeric value or content to display */
	value: ReactNode;
	/** The label/description text below the value */
	label: string;
	/** Optional badge or additional content to display next to the value */
	badge?: ReactNode;
}

/**
 * StatCard - Individual stat display card
 *
 * Displays a metric with a large value, optional badge, and descriptive label.
 * Designed to be used within StatGroup for consistent spacing and layout.
 *
 * @param value - The main statistic (typically a number or formatted value)
 * @param label - Descriptive text explaining what the statistic represents
 * @param badge - Optional badge element to display alongside the value (e.g., status badge)
 *
 * @example
 * ```tsx
 * <StatCard
 *   value={42}
 *   label="Total Documents"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <StatCard
 *   value={12}
 *   label="Processing"
 *   badge={
 *     <Badge variant="secondary">
 *       <Loader className="h-3 w-3 animate-spin" />
 *       Active
 *     </Badge>
 *   }
 * />
 * ```
 */
export function StatCard({ value, label, badge }: StatCardProps) {
	return (
		<Card className="border border-border bg-popover">
			<CardContent className="p-4">
				<div className="flex flex-col gap-0">
					<div className="flex items-center gap-3">
						<h3 className="text-2xl font-normal text-foreground">{value}</h3>
						{badge}
					</div>
					<p className="text-sm text-muted-foreground">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}
