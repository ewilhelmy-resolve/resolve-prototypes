interface AutomationMetricsCardProps {
	/** Number of automated tickets */
	automated?: number;
	/** Minutes saved through automation */
	minsSaved?: number;
	/** Dollar amount saved */
	savings?: number;
	/** Optional className for the container */
	className?: string;
}

/**
 * AutomationMetricsCard - Displays key automation metrics
 *
 * Shows a 3-column grid with:
 * - Automated ticket count
 * - Minutes saved
 * - Cost savings
 *
 * @component
 */
export function AutomationMetricsCard({
	automated = 0,
	minsSaved = 0,
	savings = 0,
	className,
}: AutomationMetricsCardProps) {
	const formatSavings = (value: number) => {
		if (value >= 1000) {
			return `$${(value / 1000).toFixed(1)}k`;
		}
		return `$${value}`;
	};

	return (
		<div className={className}>
			<div className="rounded-lg border p-3">
				<div className="grid grid-cols-3 gap-8 text-center">
					<div>
						<div className="text-2xl font-medium">{automated}</div>
						<div className="text-xs text-muted-foreground">Automated</div>
					</div>
					<div>
						<div className="text-2xl font-medium">{minsSaved}</div>
						<div className="text-xs text-muted-foreground">Mins Saved</div>
					</div>
					<div>
						<div className="text-2xl font-medium">{formatSavings(savings)}</div>
						<div className="text-xs text-muted-foreground">Savings</div>
					</div>
				</div>
			</div>
		</div>
	);
}
