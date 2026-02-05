import type { ReactNode } from "react";

interface StatGroupProps {
	/** StatCard children to display in a responsive grid */
	children: ReactNode;
}

/**
 * StatGroup - Container for displaying multiple StatCards in a responsive grid
 *
 * Provides consistent spacing and responsive layout for statistics cards.
 * - 1 column on mobile
 * - 4 columns on large screens (lg breakpoint)
 *
 * @param children - StatCard components to display in the grid
 *
 * @example
 * ```tsx
 * <StatGroup>
 *   <StatCard value={42} label="Total Items" />
 *   <StatCard value={10} label="Active" badge={<Badge>Live</Badge>} />
 *   <StatCard value={2} label="Failed" />
 *   <StatCard value={30} label="Completed" />
 * </StatGroup>
 * ```
 */
export function StatGroup({ children }: StatGroupProps) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">{children}</div>
	);
}
