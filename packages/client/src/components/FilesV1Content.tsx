/**
 * FilesV1Content - Knowledge Articles Management with v0 UI
 *
 * Uses the v0-generated KnowledgeArticles component as the UI foundation
 * while hooking up all RITA API functionality for file management.
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
	Upload,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BulkActions } from "@/components/BulkActions";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import EmptyFilesState from "@/components/knowledge-articles/EmptyFilesState";
import { MainHeader } from "@/components/MainHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { SOURCE_METADATA } from "@/constants/connectionSources";
import {
	type FileDocument,
	fileKeys,
	useDeleteFile,
	useDownloadFile,
	useFiles,
	useReprocessFile,
	useUploadFile,
} from "@/hooks/api/useFiles";
import { useQueryClient } from "@tanstack/react-query";
import { useDataSources } from "@/hooks/useDataSources";
import {
	FILE_SOURCE,
	FILE_SOURCE_DISPLAY_NAMES,
	FILE_STATUS,
	type FileSourceType,
	SUPPORTED_DOCUMENT_TYPES,
	validateFileForUpload,
} from "@/lib/constants";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { renderSortIcon } from "@/lib/table-utils";
import { cn } from "@/lib/utils";
import type { DataSourceConnection } from "@/types/dataSource";

// Registry for status icons
const STATUS_ICON_REGISTRY: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	[FILE_STATUS.UPLOADED]: Check,
	[FILE_STATUS.PROCESSING]: Loader,
	[FILE_STATUS.PROCESSED]: CheckCircle,
	[FILE_STATUS.FAILED]: AlertCircle,
	[FILE_STATUS.PENDING]: Loader,
	[FILE_STATUS.SYNCING]: Zap,
};

// Registry for status icon animations
const STATUS_ICON_ANIMATIONS: Record<string, string> = {
	[FILE_STATUS.PROCESSING]: "animate-spin",
	[FILE_STATUS.PENDING]: "animate-spin",
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

type SortField =
	| "filename"
	| "size"
	| "type"
	| "status"
	| "source"
	| "created_at";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 50;

export default function FilesV1Content() {
	const { t } = useTranslation(["kbs", "toast"]);
	const [searchInput, setSearchInput] = useState(""); // User's input (immediate)
	const [searchQuery, setSearchQuery] = useState(""); // Debounced value (for API)
	const [statusFilter, setStatusFilter] = useState("All");
	const [sourceFilter, setSourceFilter] = useState("All");
	const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
	const [fileToDelete, setFileToDelete] = useState<FileDocument | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
	const [sortField, setSortField] = useState<SortField>("created_at");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
	const [page, setPage] = useState(0);
	const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);
	const [deletingRemaining, setDeletingRemaining] = useState<number | null>(null);
	const [uploadProgress, setUploadProgress] = useState<{ total: number; current: number } | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const enableMultiFileUpload = useFeatureFlag("ENABLE_MULTI_FILE_UPLOAD");

	// Debounce search input - wait 500ms after user stops typing
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchQuery(searchInput);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchInput]);

	// API-level sorting, pagination, and filtering
	const { data: filesData, isLoading, error } = useFiles({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		sortBy: sortField,
		sortOrder,
		search: searchQuery,
		status: statusFilter !== "All" ? statusFilter : undefined,
		source: sourceFilter !== "All" ? getSourceDatabaseValue(sourceFilter) : undefined,
	});
	const { data: dataSourcesData } = useDataSources();
	const uploadFileMutation = useUploadFile();
	const downloadFileMutation = useDownloadFile();
	const reprocessFileMutation = useReprocessFile();
	const deleteFileMutation = useDeleteFile();

	const files = filesData?.documents || [];
	const totalFiles = filesData?.total || 0;
	const dataSources = dataSourcesData || [];

	// Filter synced sources (completed + enabled)
	const syncedSources = dataSources.filter(
		(source: DataSourceConnection) =>
			source.last_sync_status === "completed" && source.enabled,
	);

	// Show error toast when API fails
	useEffect(() => {
		if (error) {
			ritaToast.error({
				title: t("toast:error.loadFilesFailed"),
				description: error instanceof Error ? error.message : "Unable to fetch files. Please try again.",
			});
		}
	}, [error, t]);

	// Reset to page 0 when filters change
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset page when filters change
	useEffect(() => {
		setPage(0);
	}, [searchQuery, statusFilter, sourceFilter]);

	// Handle sorting - resets to page 0 on sort change
	const handleSort = (field: SortField) => {
		if (sortField === field) {
			// Toggle order if clicking same column
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			// Set new column with default desc order
			setSortField(field);
			setSortOrder("desc");
		}
		setPage(0); // Reset to first page on sort change
	};

	// Server-side filtering - no client-side filtering needed
	// Files returned from API are already filtered
	const sortedFiles = files;

	// Pagination handlers
	// Check if there's a next page based on total files from API
	const hasNextPage = (page + 1) * PAGE_SIZE < totalFiles;
	const hasPrevPage = page > 0;

	const handleNextPage = () => {
		if (hasNextPage) {
			setPage(page + 1);
			setSelectedFiles(new Set()); // Clear selection on page change
		}
	};

	const handlePrevPage = () => {
		if (hasPrevPage) {
			setPage(page - 1);
			setSelectedFiles(new Set()); // Clear selection on page change
		}
	};

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
		// Close dialog first, then start deletion
		setBulkDeleteDialogOpen(false);
		setIsBulkDeleting(true);

		// Delete selected files one by one
		let successCount = 0;
		let failCount = 0;
		const filesToDelete = Array.from(selectedFiles);
		let remaining = filesToDelete.length;
		setDeletingRemaining(remaining);

		for (const fileId of filesToDelete) {
			try {
				await new Promise<void>((resolve, reject) => {
					deleteFileMutation.mutate(fileId, {
						onSuccess: () => {
							successCount++;
							remaining--;
							setDeletingRemaining(remaining);
							resolve();
						},
						onError: () => {
							failCount++;
							remaining--;
							setDeletingRemaining(remaining);
							reject();
						},
					});
				});
			} catch {
				// Error already counted in failCount
			}
		}

		// Clear loading state
		setIsBulkDeleting(false);
		setDeletingRemaining(null);

		// Clear selection after deletion attempts
		setSelectedFiles(new Set());

		// Final refetch to sync with server state
		queryClient.invalidateQueries({ queryKey: fileKeys.lists(), refetchType: 'active' });

		// Show summary toast
		if (failCount === 0) {
			ritaToast.success({
				title: t("toast:success.documentsDeleted"),
				description: t("toast:descriptions.deletedDocuments", { count: successCount }),
			});
		} else if (successCount === 0) {
			ritaToast.error({
				title: t("toast:error.deleteFailed"),
				description: t("toast:descriptions.deletedFailed", { count: failCount }),
			});
		} else {
			ritaToast.warning({
				title: t("toast:warning.partialSuccess"),
				description: t("toast:descriptions.partialDelete", { success: successCount, failed: failCount }),
			});
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const cleanFilter = () => {
		setSearchInput("");
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		cleanFilter();
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const filesToUpload = Array.from(files);
		let successCount = 0;
		let errorCount = 0;
		let duplicateCount = 0;
		const errors: string[] = [];
		const duplicates: string[] = [];
		const successfulFilenames: string[] = [];

		// Initialize processing tracking BEFORE uploads start
		// This prevents SSE events from triggering early toasts during the upload loop
		const processingKey = 'rita-processing-files';
		sessionStorage.setItem(processingKey, JSON.stringify({
			total: 0, // Will be set after uploads complete
			processed: 0,
			failed: 0,
			duplicates: 0,
			uploading: true, // Flag to indicate uploads are in progress
		}));

		// Show initial toast
		ritaToast.info({
			title: t("toast:info.uploadingFiles"),
			description: t("toast:descriptions.startingUpload", { count: filesToUpload.length }),
		});

		// Initialize upload progress for multiple files
		if (filesToUpload.length > 1) {
			setUploadProgress({ total: filesToUpload.length, current: 0 });
		}

		// Process each file
		for (let i = 0; i < filesToUpload.length; i++) {
			const file = filesToUpload[i];

			// Update progress
			if (filesToUpload.length > 1) {
				setUploadProgress({ total: filesToUpload.length, current: i + 1 });
			}

			// Validate file type before upload
			const validation = validateFileForUpload(file);
			if (!validation.isValid && validation.error) {
				errorCount++;
				errors.push(`${file.name}: ${validation.error.description}`);
				continue;
			}

			// Track uploading state
			setUploadingFiles((prev) => new Set(prev).add(file.name));

			try {
				const response = await uploadFileMutation.mutateAsync(file);
				successCount++;
				// Use server's returned filename (not client's file.name) for SSE tracking
				successfulFilenames.push(response.document.filename);
			} catch (error: any) {
				// Handle duplicate file (409 Conflict) - treat differently from errors
				if (error.status === 409 && error.data?.existing_filename) {
					duplicateCount++;
					duplicates.push(`${file.name}: Already exists as "${error.data.existing_filename}"`);
				} else {
					errorCount++;
					errors.push(`${file.name}: ${error.message || "Upload failed"}`);
				}
			} finally {
				// Remove from uploading state
				setUploadingFiles((prev) => {
					const next = new Set(prev);
					next.delete(file.name);
					return next;
				});
			}
		}

		// Clear upload progress
		setUploadProgress(null);

		// Reset file input to allow re-selection
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}

		// Invalidate files query cache if any files were uploaded successfully
		if (successCount > 0) {
			queryClient.invalidateQueries({ queryKey: fileKeys.lists(), refetchType: 'active' });
		}

		// Update processing tracking and mark uploads complete
		if (successCount > 0) {
			// Get current tracking data to preserve any SSE updates that happened during upload
			const currentData = JSON.parse(sessionStorage.getItem(processingKey) || '{}');
			const processed = currentData.processed || 0;
			const failed = currentData.failed || 0;

			const trackingData = {
				total: successCount, // Total files that need processing
				processed,
				failed,
				duplicates: duplicateCount,
				uploading: false, // Uploads complete, SSE can now show final toast
			};
			sessionStorage.setItem(processingKey, JSON.stringify(trackingData));

			// Check if all files already processed while uploading (for fast processing)
			if (processed + failed >= successCount) {
				// All files already processed, show final toast
				const duplicateMsg = duplicateCount > 0 ? `, ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} skipped` : '';

				if (processed > 0 && failed === 0 && duplicateCount === 0) {
					ritaToast.success({
						title: t("toast:success.processingComplete"),
						description: processed === 1
							? t("toast:descriptions.fileProcessed")
							: t("toast:descriptions.allFilesProcessed"),
					});
				} else if (processed > 0 && failed === 0 && duplicateCount > 0) {
					ritaToast.success({
						title: t("toast:success.processingComplete"),
						description: t("toast:descriptions.filesProcessedDuplicates", { count: processed, duplicates: duplicateCount }),
					});
				} else if (processed === 0 && failed > 0) {
					ritaToast.error({
						title: t("toast:error.processingFailed"),
						description: failed === 1
							? `${t("toast:descriptions.fileFailed")}${duplicateMsg}`
							: `${t("toast:descriptions.allFilesFailed")}${duplicateMsg}`,
					});
				} else if (processed > 0 && failed > 0) {
					ritaToast.warning({
						title: t("toast:warning.processingPartial"),
						description: `${t("toast:descriptions.processingPartial", { processed, failed })}${duplicateMsg}`,
					});
				}

				sessionStorage.removeItem(processingKey);
				queryClient.invalidateQueries({ queryKey: fileKeys.lists(), refetchType: 'active' });
			}
		} else {
			// No successful uploads, remove tracking
			sessionStorage.removeItem(processingKey);
		}

		// Show upload summary toast (immediate feedback)
		// Note: A separate "Processing Complete" toast will appear later via SSE when files finish processing
		if (successCount > 0 && errorCount === 0 && duplicateCount === 0) {
			// All files uploaded successfully
			ritaToast.info({
				title: t("toast:success.filesUploaded"),
				description: t("toast:descriptions.uploadedProcessing", { count: successCount }),
			});
		} else if (successCount > 0 && duplicateCount > 0 && errorCount === 0) {
			// Some successful, some duplicates, no errors
			ritaToast.warning({
				title: t("toast:success.filesUploaded"),
				description: t("toast:descriptions.uploadedWithDuplicates", { success: successCount, duplicates: duplicateCount }),
			});
		} else if (successCount > 0 && errorCount > 0) {
			// Mixed success and errors (may also have duplicates)
			ritaToast.warning({
				title: t("toast:warning.someFilesUploaded"),
				description: duplicateCount > 0
					? t("toast:descriptions.uploadedWithErrorsAndDuplicates", { success: successCount, failed: errorCount, duplicates: duplicateCount })
					: t("toast:descriptions.uploadedWithErrors", { success: successCount, failed: errorCount }),
			});
		} else if (errorCount > 0 || duplicateCount > 0) {
			// All failed or all duplicates (no successes)
			if (duplicateCount > 0 && errorCount === 0) {
				ritaToast.warning({
					title: t("toast:warning.filesAlreadyExist"),
					description: t("toast:descriptions.filesAlreadyExist", { count: duplicateCount }),
				});
			} else if (duplicateCount > 0 && errorCount > 0) {
				// Both errors and duplicates, no successes
				ritaToast.error({
					title: t("toast:error.uploadFailed"),
					description: t("toast:descriptions.uploadErrorsAndDuplicates", { errors: errorCount, duplicates: duplicateCount }),
				});
			} else {
				ritaToast.error({
					title: t("toast:error.uploadFailed"),
					description: errors.length > 0 ? errors[0] : t("toast:descriptions.uploadAllFailed"),
				});
			}
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
						title: t("toast:success.downloadStarted"),
						description: t("toast:descriptions.downloading", { name: file.filename }),
					});
				},
				onError: () => {
					ritaToast.error({
						title: t("toast:error.downloadFailed"),
						description: t("toast:descriptions.downloadFailed", { name: file.filename }),
					});
				},
			},
		);
	};

	const handleReprocess = (file: FileDocument) => {
		reprocessFileMutation.mutate(file.id, {
			onSuccess: () => {
				ritaToast.success({
					title: t("toast:success.reprocessStarted"),
					description: t("toast:descriptions.reprocessing", { name: file.filename }),
				});
			},
			onError: () => {
				ritaToast.error({
					title: t("toast:error.reprocessFailed"),
					description: t("toast:descriptions.reprocessFailed", { name: file.filename }),
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
						title: t("toast:success.documentDeleted"),
						description: t("toast:descriptions.documentDeleted", { name: fileName }),
					});
				},
				onError: () => {
					ritaToast.error({
						title: t("toast:error.deleteFailed"),
						description: t("toast:descriptions.documentDeleteFailed", { name: fileName }),
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
			case FILE_STATUS.PROCESSED:
				return "default";
			case FILE_STATUS.PROCESSING:
				return "secondary";
			case FILE_STATUS.FAILED:
				return "destructive";
			default:
				return "outline";
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<MainHeader
				title={t("header.title")}
				action={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button disabled={uploadFileMutation.isPending}>
								{uploadFileMutation.isPending ? (
									<Loader className="h-4 w-4 animate-spin" />
								) : (
									<Plus className="h-4 w-4" />
								)}
								{t("header.addButton")}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{/* Upload file option */}
							<DropdownMenuItem
								onClick={handleUploadClick}
								disabled={uploadingFiles.size > 0}
							>
								{uploadingFiles.size > 0 ? (
									<Loader className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Upload className="h-4 w-4 mr-2" />
								)}
								{uploadingFiles.size > 0 ? t("dropdown.uploadingFiles", { count: uploadingFiles.size }) : t("dropdown.uploadFile")}
							</DropdownMenuItem>

							{/* Connect sources option */}
							<DropdownMenuItem
								onClick={() => navigate("/settings/connections")}
							>
								<Plus className="h-4 w-4 mr-2" />
								{t("dropdown.connectSources")}
								<div className="ml-auto flex gap-1 pl-8">
									<img
										src="/connections/icon_confluence.svg"
										alt=""
										className="h-4 w-4"
									/>
									<img
										src="/connections/icon_sharepoint.svg"
										alt=""
										className="h-4 w-4"
									/>
									<img
										src="/connections/icon_servicenow.svg"
										alt=""
										className="h-4 w-4"
									/>
								</div>
							</DropdownMenuItem>

							{/* Synced sources */}
							{syncedSources.length > 0 && (
								<>
									<DropdownMenuSeparator />
									{syncedSources.map((source: DataSourceConnection) => (
										<DropdownMenuItem
											key={source.id}
											onClick={() =>
												navigate(`/settings/connections/${source.id}`)
											}
										>
											<img
												src={`/connections/icon_${source.type}.svg`}
												alt=""
												className="h-4 w-4 mr-2"
											/>
											{SOURCE_METADATA[source.type]?.title || source.type}
										</DropdownMenuItem>
									))}
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				}
			/>

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
								placeholder={t("search.placeholder")}
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								className="max-w-sm"
							/>
							<div className="flex gap-4">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline">
											{t("filters.source")} {sourceFilter === "All" ? t("filters.all") : sourceFilter}
											<ChevronDown className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem onSelect={() => setSourceFilter("All")}>
											{t("filters.allSources")}
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
											{t("filters.status")}{" "}
											{statusFilter === "All"
												? t("filters.all")
												: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
											<ChevronDown className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem onSelect={() => setStatusFilter("All")}>
											{t("filters.allStatus")}
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter(FILE_STATUS.PROCESSED)}
										>
											{t("status.processed")}
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter(FILE_STATUS.PROCESSING)}
										>
											{t("status.processing")}
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter(FILE_STATUS.FAILED)}
										>
											{t("status.failed")}
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setStatusFilter(FILE_STATUS.UPLOADED)}
										>
											{t("status.uploaded")}
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
							isLoading={isBulkDeleting}
							remainingCount={deletingRemaining}
						/>
					)}

					{/* Upload Progress Bar */}
					{uploadProgress && (
						<div className="flex items-center gap-4 p-4 bg-muted/50 border rounded-md">
							<Loader className="h-4 w-4 animate-spin text-primary" />
							<div className="flex-1">
								<div className="flex justify-between text-sm mb-1">
									<span>{t("uploadProgress.uploading")}</span>
									<span>{t("uploadProgress.progress", { current: uploadProgress.current, total: uploadProgress.total })}</span>
								</div>
								<Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
							</div>
						</div>
					)}

					{/* Empty State */}
					{!isLoading && sortedFiles.length === 0 ? (
						<EmptyFilesState
							hasActiveFilters={
								searchInput !== "" ||
								statusFilter !== "All" ||
								sourceFilter !== "All"
							}
							onUploadClick={handleUploadClick}
						/>
					) : (
						/* Table */
						<div className="relative border rounded-md">
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
												{t("table.name")}
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
												{t("table.status")}
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
												{t("table.source")}
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
												{t("table.size")}
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
												{t("table.lastModified")}
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
														<div className="flex items-center gap-2">
															<Badge
																variant={getStatusVariant(file.status)}
																className="flex items-center gap-1 w-fit"
															>
																{getStatusIcon(file.status)}
																{getStatusLabel(file.status)}
															</Badge>
															{file.status === FILE_STATUS.FAILED && (
																<Button
																	variant="link"
																	size="sm"
																	onClick={() => handleReprocess(file)}
																	disabled={reprocessFileMutation.isPending}
																	className="h-7 px-2 gap-1.5 hover:no-underline"
																>
																	<RefreshCw
																		className={cn(
																			"h-3 w-3",
																			reprocessFileMutation.isPending &&
																				"animate-spin",
																		)}
																	/>
																	<span className="text-xs">{t("actions.retry")}</span>
																</Button>
															)}
														</div>
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
																	(file.status === FILE_STATUS.UPLOADED ||
																		file.status === FILE_STATUS.PROCESSED) && (
																		<DropdownMenuItem
																			onClick={() => handleDownload(file)}
																		>
																			<Download className="h-4 w-4 mr-2" />
																			{t("actions.download")}
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
																		{t("actions.reprocess")}
																	</DropdownMenuItem>
																)}
																{/* Delete option - always available */}
																<DropdownMenuItem
																	onClick={() => handleDelete(file)}
																	disabled={deleteFileMutation.isPending}
																	variant="destructive"
																>
																	<Trash2 className="h-4 w-4 mr-2" />
																	{t("actions.delete")}
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

					{/* Footer with Pagination */}
					{!isLoading && sortedFiles.length > 0 && (
						<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
							<p className="text-sm text-muted-foreground">
								{searchInput || statusFilter !== "All" || sourceFilter !== "All" ? (
									// Show filtered results info
									t("pagination.showingFiltered", { count: sortedFiles.length, total: totalFiles })
								) : (
									// Show pagination range when no filters
									t("pagination.showing", { start: page * PAGE_SIZE + 1, end: Math.min((page + 1) * PAGE_SIZE, totalFiles), total: totalFiles })
								)}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handlePrevPage}
									disabled={!hasPrevPage}
								>
								{t("pagination.previous")}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handleNextPage}
									disabled={!hasNextPage}
								>
									{t("pagination.next")}
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple={enableMultiFileUpload}
				className="hidden"
				onChange={handleFileChange}
				accept={SUPPORTED_DOCUMENT_TYPES}
				disabled={uploadFileMutation.isPending || uploadingFiles.size > 0}
			/>

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				title={t("dialogs.deleteTitle")}
				description={t("dialogs.deleteDescription", { filename: fileToDelete?.filename })}
				onConfirm={confirmDelete}
				confirmLabel={t("actions.delete")}
				variant="destructive"
			/>

			{/* Bulk Delete Confirmation Dialog */}
			<ConfirmDialog
				open={bulkDeleteDialogOpen}
				onOpenChange={setBulkDeleteDialogOpen}
				title={t("dialogs.bulkDeleteTitle")}
				description={t("dialogs.bulkDeleteDescription", { count: selectedFiles.size })}
				onConfirm={handleConfirmBulkDelete}
				confirmLabel={t("actions.delete")}
				variant="destructive"
			/>
		</div>
	);
}
