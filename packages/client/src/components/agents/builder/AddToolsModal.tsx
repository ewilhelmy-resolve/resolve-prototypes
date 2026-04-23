/**
 * AddToolsModal - Modal for selecting tools to assign to an agent
 *
 * Features:
 * - Server-side search by name
 * - Infinite scroll (100 per page)
 * - Humanized tool names + descriptions
 * - Toggle selection with switch
 * - Skeleton loading states
 */

import { Search, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InfiniteScrollContainer } from "@/components/custom/infinite-scroll-container";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTools } from "@/hooks/api/useTools";
import { useDebounce } from "@/hooks/useDebounce";
import { humanizeToolName } from "@/lib/utils";

interface AddToolsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentTools: string[];
	onAdd: (toolNames: string[]) => void;
}

export function AddToolsModal({
	open,
	onOpenChange,
	currentTools,
	onAdd,
}: AddToolsModalProps) {
	const { t } = useTranslation("agents");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTools, setSelectedTools] = useState<string[]>([]);

	const debouncedSearch = useDebounce(searchQuery, 300);
	const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useTools(open ? { search: debouncedSearch || undefined } : undefined);

	const tools = data?.pages.flatMap((page) => page.tools) ?? [];

	const handleClose = () => {
		onOpenChange(false);
		setSearchQuery("");
		setSelectedTools([]);
	};

	const handleAdd = () => {
		onAdd(selectedTools);
		handleClose();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-lg h-[600px] overflow-hidden flex flex-col p-0 gap-0"
			>
				{/* Close */}
				<button
					type="button"
					onClick={handleClose}
					className="absolute right-4 top-4 text-muted-foreground/70 hover:text-foreground z-10"
					aria-label={t("addToolsModal.close")}
				>
					<X className="size-4" />
				</button>

				{/* Header + Search */}
				<div className="px-6 pt-6 flex flex-col gap-4">
					<div>
						<h2 className="text-lg font-semibold">
							{t("addToolsModal.title")}
						</h2>
						<p className="text-sm text-muted-foreground mt-1.5">
							{t("addToolsModal.description")}
						</p>
					</div>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder={t("addToolsModal.searchPlaceholder")}
							className="pl-9 rounded-lg"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Tools list with infinite scroll */}
				<div className="flex-1 overflow-y-auto mt-4">
					{isLoading ? (
						<div className="space-y-1 px-6">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="flex items-start gap-3 py-[10px]">
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-40" />
										<Skeleton className="h-3 w-64" />
									</div>
									<Skeleton className="h-5 w-9 rounded-full" />
								</div>
							))}
						</div>
					) : (
						<InfiniteScrollContainer
							hasMore={!!hasNextPage}
							isLoading={isFetchingNextPage}
							onLoadMore={() => fetchNextPage()}
						>
							{tools.map((tool) => {
								const isAlreadyAdded = currentTools.includes(tool.name);
								const isSelected = selectedTools.includes(tool.name);

								return (
									<div
										key={tool.eid}
										className="flex items-start gap-3 px-6 py-[10px] border-b"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium leading-none">
												{humanizeToolName(tool.name)}
											</p>
											{tool.description && (
												<p className="text-xs text-muted-foreground leading-5 mt-0.5 line-clamp-2">
													{tool.description}
												</p>
											)}
										</div>
										<div className="flex-shrink-0 pt-0.5">
											{isAlreadyAdded ? (
												<span className="text-xs text-muted-foreground">
													{t("addToolsModal.added")}
												</span>
											) : (
												<Switch
													checked={isSelected}
													aria-label={humanizeToolName(tool.name)}
													onCheckedChange={(checked) => {
														setSelectedTools((prev) =>
															checked
																? [...prev, tool.name]
																: prev.filter((n) => n !== tool.name),
														);
													}}
												/>
											)}
										</div>
									</div>
								);
							})}
							{tools.length === 0 && (
								<div className="py-8 text-center text-sm text-muted-foreground">
									{searchQuery
										? t("addToolsModal.noResults", { query: searchQuery })
										: t("addToolsModal.empty")}
								</div>
							)}
						</InfiniteScrollContainer>
					)}
				</div>

				{/* Footer */}
				<div className="px-6 py-3 flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={handleClose}>
						{t("addToolsModal.cancel")}
					</Button>
					<Button
						size="sm"
						disabled={selectedTools.length === 0}
						onClick={handleAdd}
					>
						{selectedTools.length > 0
							? t("addToolsModal.addCount", { count: selectedTools.length })
							: t("addToolsModal.add")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
