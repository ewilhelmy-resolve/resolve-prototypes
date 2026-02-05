import type { ReactNode } from "react";

interface MainHeaderProps {
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	stats?: ReactNode;
}

/**
 * MainHeader - Reusable header component for main content areas
 *
 * Provides consistent styling for page headers with optional description, action buttons/menus and statistics
 *
 * @param title - The main heading text to display
 * @param description - Optional description text or component to display below the title
 * @param action - Optional action element (button, dropdown menu, etc.) to render on the right
 * @param stats - Optional statistics component (typically StatGroup with StatCards) to display below the header
 *
 * @example
 * ```tsx
 * <MainHeader title="Knowledge Articles" />
 * ```
 *
 * @example
 * ```tsx
 * <MainHeader
 *   title="Knowledge Articles"
 *   description="Manage your knowledge base and documentation"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <MainHeader
 *   title="Knowledge Articles"
 *   action={
 *     <DropdownMenu>
 *       <DropdownMenuTrigger asChild>
 *         <Button>Add Articles</Button>
 *       </DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Upload file</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 *   }
 * />
 * ```
 *
 * @example
 * ```tsx
 * <MainHeader
 *   title="Knowledge Articles"
 *   description="Manage your knowledge base"
 *   action={<Button>Add</Button>}
 *   stats={
 *     <StatGroup>
 *       <StatCard value={42} label="Total Documents" />
 *       <StatCard
 *         value={10}
 *         label="Processing"
 *         badge={<Badge variant="secondary">Active</Badge>}
 *       />
 *     </StatGroup>
 *   }
 * />
 * ```
 */
export function MainHeader({
	title,
	description,
	action,
	stats,
}: MainHeaderProps) {
	return (
		<div className="border-b border-border px-6 py-6 flex-shrink-0">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-normal text-foreground">{title}</h1>
					{description && (
						<div className="text-muted-foreground mt-1">{description}</div>
					)}
				</div>
				{action && <div>{action}</div>}
			</div>
			{stats && <div className="mt-4">{stats}</div>}
		</div>
	);
}
