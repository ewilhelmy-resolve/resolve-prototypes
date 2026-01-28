import { Skeleton } from "@/components/ui/skeleton";

/**
 * TicketGroupSkeleton - Loading placeholder matching TicketGroupStat dimensions
 *
 * Used when ML model training is in progress and clusters aren't available yet.
 */
export function TicketGroupSkeleton() {
	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
			{/* Title and Count */}
			<div className="flex flex-col gap-3.5">
				<Skeleton className="h-7 w-3/4" />
				<Skeleton className="h-9 w-16" />
			</div>

			{/* Progress Bar */}
			<div className="flex flex-col gap-2">
				<Skeleton className="h-2 w-full rounded-full" />
				<div className="flex justify-between">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-24" />
				</div>
			</div>

			{/* Knowledge Status Badge */}
			<Skeleton className="h-5 w-24 rounded-full" />
		</div>
	);
}

/**
 * TicketGroupSkeletonGrid - Grid of skeleton cards for loading state
 */
export function TicketGroupSkeletonGrid({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{[...Array(count)].map((_, i) => (
				<TicketGroupSkeleton key={i} />
			))}
		</div>
	);
}
