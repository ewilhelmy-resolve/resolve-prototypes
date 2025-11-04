/**
 * FilesV1Content - Knowledge Articles Management with v0 UI
 *
 * Uses the v0-generated KnowledgeArticles component as the UI foundation
 * while hooking up all Rita API functionality for file management.
 */

import {
	AlertCircle,
	Check,
	CheckCircle,
	ChevronDown,
	Download,
	Loader,
	MoreHorizontal,
	Plus,
	RefreshCw,
	Trash2,
	Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { BulkActions } from "@/components/BulkActions";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import EmptyFilesState from "@/components/knowledge-articles/EmptyFilesState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ritaToast } from "@/components/ui/rita-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type FileDocument,
	useDeleteFile,
	useDownloadFile,
	useFiles,
	useReprocessFile,
	useUploadFile,
} from "@/hooks/api/useFiles";
import {
	FILE_SOURCE,
	FILE_SOURCE_DISPLAY_NAMES,
	type FileSourceType,
	MAX_FILE_SIZE_MB,
	SUPPORTED_DOCUMENT_EXTENSIONS,
	SUPPORTED_DOCUMENT_TYPES,
} from "@/lib/constants";
import { renderSortIcon } from "@/lib/table-utils";

// Registry for status icons
const STATUS_ICON_REGISTRY: Record<string, React.ComponentType<{ className?: string }>> = {
	uploaded: Check,
	processing: Loader,
	processed: CheckCircle,
	failed: AlertCircle,
	pending: Loader,
	syncing: Zap,
};

// Registry for status icon animations
const STATUS_ICON_ANIMATIONS: Record<string, string> = {
	processing: "animate-spin",
	pending: "animate-spin",
};

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

function formatDate(date: Date | null | undefined): string {
	if (!date) return "N/A";
	return new Intl.DateTimeFormat("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

const getSourceDisplayName = (source: string | undefined | null): string => {
	if (!source) return "-";
	const normalizedSource = source.toLowerCase() as FileSourceType;
	return FILE_SOURCE_DISPLAY_NAMES[normalizedSource] || source;
};

const getSourceDatabaseValue = (displayName: string): string => {
	// Find the matching source constant by display name
	const entry = Object.entries(FILE_SOURCE_DISPLAY_NAMES).find(
		([_, name]) => name === displayName,
	);
	return entry ? entry[0] : displayName.toLowerCase();
};

type SortField = "filename" | "size" | "type" | "status" | "source" | "created_at";
type SortOrder = "asc" | "desc";

export default function FilesV1Content() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("All");
	const [sourceFilter, setSourceFilter] = useState("All");
	const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
	const [fileToDelete, setFileToDelete] = useState<FileDocument | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
	const [sortField, setSortField] = useState<SortField>("created_at");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data: filesData, isLoading } = useFiles();
	const uploadFileMutation = useUploadFile();
	const downloadFileMutation = useDownloadFile();
	const reprocessFileMutation = useReprocessFile();
	const deleteFileMutation = useDeleteFile();

	const files = filesData?.documents || [];

	// Handle sorting
	const handleSort = (field: SortField) => {
		if (sortField === field) {
			// Toggle order if clicking same column
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			// Set new column with default desc order
			setSortField(field);
			setSortOrder("desc");
		}
	};

	// Filter files
	const filteredFiles = files.filter((file) => {
		const matchesSearch = file.filename
			.toLowerCase()
			.includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "All" || file.status === statusFilter.toLowerCase();
		const matchesSource =
			sourceFilter === "All" ||
			file.source === getSourceDatabaseValue(sourceFilter);
		return matchesSearch && matchesStatus && matchesSource;
	});

	// Sort filtered files
	const sortedFiles = [...filteredFiles].sort((a, b) => {
		let comparison = 0;

		switch (sortField) {
			case "filename":
				comparison = a.filename.localeCompare(b.filename);
				break;
			case "size":
				comparison = a.size - b.size;
				break;
			case "type":
				comparison = a.type.localeCompare(b.type);
				break;
			case "status":
				comparison = a.status.localeCompare(b.status);
				break;
			case "source":
				comparison = (a.source || "").localeCompare(b.source || "");
				break;
			case "created_at":
				comparison = (a.created_at?.getTime() || 0) - (b.created_at?.getTime() || 0);
				break;
		}

		return sortOrder === "asc" ? comparison : -comparison;
	});

	// Calculate stats (currently hidden, but kept for future use)
	// const totalDocs = filesData?.total || 0;
	// const processedCount = files.filter((f) => f.status === "processed").length;
	// const processingCount = files.filter((f) => f.status === "processing").length;
	// const failedCount = files.filter((f) => f.status === "failed").length;

	const handleSelectAll = () => {
		if (selectedFiles.size === sortedFiles.length) {
			setSelectedFiles(new Set());
		} else {
			setSelectedFiles(new Set(sortedFiles.map((f) => f.id)));
		}
	};

	const handleSelectFile = (fileId: string) => {
		const newSelected = new Set(selectedFiles);
		if (newSelected.has(fileId)) {
			newSelected.delete(fileId);
		} else {
			newSelected.add(fileId);
		}
		setSelectedFiles(newSelected);
	};

	const handleBulkDeleteClick = () => {
		setBulkDeleteDialogOpen(true);
	};

	const handleConfirmBulkDelete = async () => {
		setBulkDeleteDialogOpen(false);

		// Delete selected files one by one
		let successCount = 0;
		let failCount = 0;

		for (const fileId of selectedFiles) {
			try {
				await new Promise<void>((resolve, reject) => {
					deleteFileMutation.mutate(fileId, {
						onSuccess: () => {
							successCount++;
							resolve();
						},
						onError: () => {
							failCount++;
							reject();
						},
					});
				});
			} catch {
				// Error already counted in failCount
			}
		}

		// Clear selection after deletion attempts
		setSelectedFiles(new Set());

		// Show summary toast
		if (failCount === 0) {
			ritaToast.success({
				title: "Documents Deleted",
				description: `Successfully deleted ${successCount} document${successCount !== 1 ? "s" : ""}`,
			});
		} else if (successCount === 0) {
			ritaToast.error({
				title: "Delete Failed",
				description: `Failed to delete ${failCount} document${failCount !== 1 ? "s" : ""}`,
			});
		} else {
			ritaToast.warning({
				title: "Partial Success",
				description: `Deleted ${successCount} document${successCount !== 1 ? "s" : ""}, ${failCount} failed`,
			});
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			uploadFileMutation.mutate(e.target.files[0], {
				onSuccess: () => {
					ritaToast.success({
						title: "File Uploaded",
						description:
							"Document uploaded successfully and processing started",
					});
				},
				onError: (error) => {
					ritaToast.error({
						title: "Upload Failed",
						description: error.message || "Failed to upload document",
					});
				},
			});
		}
	};

	const handleDownload = (file: FileDocument) => {
		downloadFileMutation.mutate(
			{
				documentId: file.id,
				filename: file.filename,
			},
			{
				onSuccess: () => {
					ritaToast.success({
						title: "Download Started",
						description: `Downloading ${file.filename}`,
					});
				},
				onError: () => {
					ritaToast.error({
						title: "Download Failed",
						description: `Could not download ${file.filename}`,
					});
				},
			},
		);
	};

	const handleReprocess = (file: FileDocument) => {
		reprocessFileMutation.mutate(file.id, {
			onSuccess: () => {
				ritaToast.success({
					title: "Reprocessing Started",
					description: `Document ${file.filename} is being reprocessed`,
				});
			},
			onError: () => {
				ritaToast.error({
					title: "Reprocess Failed",
					description: `Could not reprocess ${file.filename}`,
				});
			},
		});
	};

	const handleDelete = (file: FileDocument) => {
		setFileToDelete(file);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = () => {
		if (fileToDelete) {
			const fileName = fileToDelete.filename;
			deleteFileMutation.mutate(fileToDelete.id, {
				onSuccess: () => {
					ritaToast.success({
						title: "Document Deleted",
						description: `${fileName} has been deleted`,
					});
				},
				onError: () => {
					ritaToast.error({
						title: "Delete Failed",
						description: `Could not delete ${fileName}`,
					});
				},
			});
			setDeleteDialogOpen(false);
			setFileToDelete(null);
		}
	};

	const getStatusIcon = (status: string) => {
		const IconComponent = STATUS_ICON_REGISTRY[status] || AlertCircle;
		const animation = STATUS_ICON_ANIMATIONS[status] || "";
		const className = `h-3 w-3 ${animation}`.trim();

		return <IconComponent className={className} />;
	};

	const getStatusLabel = (status: string) => {
		return status.charAt(0).toUpperCase() + status.slice(1);
	};

	const getStatusVariant = (
		status: string,
	): "default" | "secondary" | "destructive" | "outline" => {
		switch (status) {
			case "processed":
				return "default";
			case "processing":
				return "secondary";
			case "failed":
				return "destructive";
			default:
				return "outline";
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="border-b border-border px-6 py-6 flex-shrink-0">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-normal text-foreground">
							Knowledge Articles
						</h1>
					</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								onClick={handleUploadClick}
								disabled={uploadFileMutation.isPending}
							>
								{uploadFileMutation.isPending ? (
									<Loader className="h-4 w-4 animate-spin" />
								) : (
									<Plus className="h-4 w-4" />
								)}
								Add Articles
							</Button>
						</TooltipTrigger>
						<TooltipContent
							side="top"
							className="max-w-xs bg-primary text-primary-foreground"
							arrowClassName="bg-primary fill-primary"
						>
							<div className="space-y-1">
								<p>File types: {SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}</p>
								<p className="text-center">Max size: {MAX_FILE_SIZE_MB}mb</p>
							</div>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 px-6 py-6 overflow-y-auto">
				<div className="flex flex-col gap-6">
					{/* Stats Cards - Hidden for now, needs metrics calculation rethink */}
					{/*
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
						<Card className="border border-border bg-popover">
							<CardContent className="p-4">
								<div className="flex flex-col gap-0">
									<h3 className="text-2xl font-normal text-foreground">
										{totalDocs}
									</h3>
									<p className="text-sm text-muted-foreground">
										Total Documents
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-border bg-popover">
							<CardContent className="p-4">
								<div className="flex flex-col gap-0">
									<div className="flex items-center gap-3">
										<h3 className="text-2xl font-normal text-foreground">
											{processedCount}
										</h3>
										{processedCount > 0 && (
											<Badge
												variant="outline"
												className="flex items-center gap-1"
											>
												<CheckCircle className="h-3 w-3" />
												Ready
											</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										Processed Documents
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-border bg-popover">
							<CardContent className="p-4">
								<div className="flex flex-col gap-0">
									<div className="flex items-center gap-3">
										<h3 className="text-2xl font-normal text-foreground">
											{processingCount}
										</h3>
										{processingCount > 0 && (
											<Badge
												variant="secondary"
												className="flex items-center gap-1"
											>
												<Loader className="h-3 w-3 animate-spin" />
												Active
											</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">Processing</p>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-border bg-popover">
							<CardContent className="p-4">
								<div className="flex flex-col gap-0">
									<div className="flex items-center gap-3">
										<h3 className="text-2xl font-normal text-foreground">
											{failedCount}
										</h3>
										{failedCount > 0 && (
											<Badge
												variant="destructive"
												className="flex items-center gap-1"
											>
												<AlertCircle className="h-3 w-3" />
												Failed
											</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										Failed Documents
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
					*/}

					{/* Search and Filters OR Bulk Actions */}
					{selectedFiles.size === 0 ? (
						<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
							<Input
								placeholder="Search documents....."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="max-w-sm"
							/>
							<div className="flex gap-4">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline">
											Source: {sourceFilter}
											<ChevronDown className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem onSelect={() => setSourceFilter("All")}>
											All Sources
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() =>
												setSourceFilter(
													FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.MANUAL],
												)
											}
										>
											{FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.MANUAL]}
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() =>
												setSourceFilter(
													FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.CONFLUENCE],
												)
											}
										>
											{FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.CONFLUENCE]}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline">
											Status: {statusFilter}
											<ChevronDown className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem onSelect={() => setStatusFilter("All")}>
											All Status
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter("processed")}
										>
											Processed
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter("processing")}
										>
											Processing
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter("failed")}
										>
											Failed
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter("uploaded")}
										>
											Uploaded
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					) : (
						<BulkActions
							selectedItems={Array.from(selectedFiles)}
							onDelete={handleBulkDeleteClick}
							onClose={() => setSelectedFiles(new Set())}
							itemLabel="files"
						/>
					)}

					{/* Empty State */}
					{!isLoading && filteredFiles.length === 0 ? (
						<EmptyFilesState
							hasActiveFilters={
								searchQuery !== "" ||
								statusFilter !== "All" ||
								sourceFilter !== "All"
							}
							onUploadClick={handleUploadClick}
						/>
					) : (
						/* Table */
						<div className="border rounded-md">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-12">
											<Checkbox
												checked={
													selectedFiles.size === sortedFiles.length &&
													sortedFiles.length > 0
												}
												onCheckedChange={handleSelectAll}
											/>
										</TableHead>
										<TableHead>
											<Button
												variant="ghost"
												size="sm"
												className="text-muted-foreground hover:text-foreground -ml-3"
												onClick={() => handleSort("filename")}
											>
												Name
												{renderSortIcon(sortField, "filename", sortOrder)}
											</Button>
										</TableHead>
										<TableHead>
											<Button
												variant="ghost"
												size="sm"
												className="text-muted-foreground hover:text-foreground -ml-3"
												onClick={() => handleSort("status")}
											>
												Status
												{renderSortIcon(sortField, "status", sortOrder)}
											</Button>
										</TableHead>
										<TableHead>
											<Button
												variant="ghost"
												size="sm"
												className="text-muted-foreground hover:text-foreground -ml-3"
												onClick={() => handleSort("source")}
											>
												Source
												{renderSortIcon(sortField, "source", sortOrder)}
											</Button>
										</TableHead>
										<TableHead className="text-right">
											<Button
												variant="ghost"
												size="sm"
												className="text-muted-foreground hover:text-foreground -mr-3"
												onClick={() => handleSort("size")}
											>
												Size
												{renderSortIcon(sortField, "size", sortOrder)}
											</Button>
										</TableHead>
										{/*<TableHead>*/}
										{/*	<Button*/}
										{/*		variant="ghost"*/}
										{/*		size="sm"*/}
										{/*		className="text-muted-foreground hover:text-foreground"*/}
										{/*	>*/}
										{/*		Queries*/}
										{/*		<ArrowUpDown className="h-4 w-4" />*/}
										{/*	</Button>*/}
										{/*</TableHead>*/}
										<TableHead className="text-right">
											<Button
												variant="ghost"
												size="sm"
												className="text-muted-foreground hover:text-foreground -mr-3"
												onClick={() => handleSort("created_at")}
											>
												Last Modified
												{renderSortIcon(sortField, "created_at", sortOrder)}
											</Button>
										</TableHead>
										<TableHead className="w-16"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading
										? [...Array(3)].map((_, i) => (
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
											))
										: sortedFiles.map((file) => (
												<TableRow key={file.id}>
													<TableCell className="w-12">
														<Checkbox
															checked={selectedFiles.has(file.id)}
															onCheckedChange={() => handleSelectFile(file.id)}
														/>
													</TableCell>
													<TableCell>{file.filename}</TableCell>
													<TableCell>
														<Badge
															variant={getStatusVariant(file.status)}
															className="flex items-center gap-1 w-fit"
														>
															{getStatusIcon(file.status)}
															{getStatusLabel(file.status)}
														</Badge>
													</TableCell>
													<TableCell>
														{getSourceDisplayName(file.source)}
													</TableCell>
													<TableCell className="text-right">
														{formatFileSize(file.size)}
													</TableCell>
													{/*<TableCell className="text-right">-</TableCell>*/}
													<TableCell className="text-right">
														{formatDate(file.updated_at)}
													</TableCell>
													<TableCell className="w-16">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	className="text-muted-foreground hover:text-foreground"
																>
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																{/* Download option - only for manual uploads that are uploaded/processed */}
																{file.source === FILE_SOURCE.MANUAL &&
																	(file.status === "uploaded" ||
																		file.status === "processed") && (
																		<DropdownMenuItem
																			onClick={() => handleDownload(file)}
																		>
																			<Download className="h-4 w-4 mr-2" />
																			Download
																		</DropdownMenuItem>
																	)}
																{/* Reprocess option - only for manual uploads */}
																{file.source === FILE_SOURCE.MANUAL && (
																	<DropdownMenuItem
																		onClick={() => handleReprocess(file)}
																		disabled={reprocessFileMutation.isPending}
																	>
																		<RefreshCw
																			className={`h-4 w-4 mr-2 ${reprocessFileMutation.isPending ? "animate-spin" : ""}`}
																		/>
																		Reprocess
																	</DropdownMenuItem>
																)}
																{/* Delete option - always available */}
																<DropdownMenuItem
																	onClick={() => handleDelete(file)}
																	disabled={deleteFileMutation.isPending}
																	className="text-destructive focus:text-destructive"
																>
																	<Trash2 className="h-4 w-4 mr-2" />
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))}
								</TableBody>
							</Table>
						</div>
					)}

					{/* Footer */}
					{!isLoading && filteredFiles.length > 0 && (
						<div className="flex justify-center">
							<p className="text-sm text-muted-foreground">
								{filteredFiles.length} Knowledge articles
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				className="hidden"
				onChange={handleFileChange}
				accept={SUPPORTED_DOCUMENT_TYPES}
				disabled={uploadFileMutation.isPending}
			/>

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				title="Delete Document"
				description={`Are you sure you want to delete "${fileToDelete?.filename}"? This action cannot be undone.`}
				onConfirm={confirmDelete}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="destructive"
			/>

			{/* Bulk Delete Confirmation Dialog */}
			<ConfirmDialog
				open={bulkDeleteDialogOpen}
				onOpenChange={setBulkDeleteDialogOpen}
				title="Delete Documents"
				description={`Are you sure you want to delete ${selectedFiles.size} document${selectedFiles.size !== 1 ? "s" : ""}? This action cannot be undone and will permanently remove all selected files from your knowledge base.`}
				onConfirm={handleConfirmBulkDelete}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="destructive"
			/>
		</div>
	);
}
