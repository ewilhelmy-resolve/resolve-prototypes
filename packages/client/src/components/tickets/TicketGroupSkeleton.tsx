import { Skeleton } from "@/components/ui/skeleton";

/**
 * TicketGroupSkeleton - Loading placeholder matching TicketGroupStat dimensions
 *
 * Used when ML model training is in progress and clusters aren't available yet.
 */
export function TicketGroupSkeleton() {
	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
			{/* Title */}
			<Skeleton className="h-7 w-3/4" />

			{/* Count + metrics row */}
			<div className="flex items-end justify-between">
				<div className="flex items-baseline gap-2">
					<Skeleton className="h-9 w-16" />
					<Skeleton className="h-4 w-20" />
				</div>
				<Skeleton className="h-6 w-6 rounded-full" />
			</div>

			{/* Footer */}
			<div className="border-t border-border pt-3">
				<Skeleton className="h-4 w-32" />
			</div>
		</div>
	);
}

/**
 * TicketGroupSkeletonGrid - Grid of skeleton cards for loading state
 */
export function TicketGroupSkeletonGrid({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
			{[...Array(count)].map((_, i) => (
				<TicketGroupSkeleton key={i} />
			))}
		</div>
	);
}
