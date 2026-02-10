import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface FilesTableSkeletonProps {
	/** Number of skeleton rows to render */
	rows?: number;
}

export function FilesTableSkeleton({ rows = 3 }: FilesTableSkeletonProps) {
	return (
		<>
			{[...Array(rows)].map((_, i) => (
				<TableRow key={i}>
					<TableCell className="w-12">
						<Skeleton className="h-4 w-4" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-[200px]" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-[80px]" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-[100px]" />
					</TableCell>
					<TableCell className="text-right">
						<Skeleton className="h-4 w-[60px] ml-auto" />
					</TableCell>
					<TableCell className="text-right">
						<Skeleton className="h-4 w-[120px] ml-auto" />
					</TableCell>
					<TableCell className="w-16">
						<Skeleton className="h-4 w-[30px]" />
					</TableCell>
				</TableRow>
			))}
		</>
	);
}
