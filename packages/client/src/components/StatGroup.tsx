import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const columnClasses: Record<number, string> = {
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-4",
	5: "lg:grid-cols-5",
};

interface StatGroupProps {
	/** StatCard children to display in a responsive grid */
	children: ReactNode;
	/** Number of columns on large screens (default: 4) */
	columns?: number;
}

export function StatGroup({ children, columns = 4 }: StatGroupProps) {
	return (
		<div className={cn("grid grid-cols-1 gap-4", columnClasses[columns])}>
			{children}
		</div>
	);
}
