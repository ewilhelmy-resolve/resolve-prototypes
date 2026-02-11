/**
 * FilesV1Content - Knowledge Articles Management with v0 UI
 *
 * Uses the v0-generated KnowledgeArticles component as the UI foundation
 * while hooking up all RITA API functionality for file management.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { BulkActions } from "@/components/BulkActions";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { AddKnowledgeMenu } from "@/components/knowledge-articles/AddKnowledgeMenu";
import EmptyFilesState from "@/components/knowledge-articles/EmptyFilesState";
import { FileRowActionMenu } from "@/components/knowledge-articles/FileRowActionMenu";
import { FileSourceFilter } from "@/components/knowledge-articles/FileSourceFilter";
import { FileStatusBadge } from "@/components/knowledge-articles/FileStatusBadge";
import { FileStatusFilter } from "@/components/knowledge-articles/FileStatusFilter";
import { FilesPagination } from "@/components/knowledge-articles/FilesPagination";
import { FilesTableSkeleton } from "@/components/knowledge-articles/FilesTableSkeleton";
import { UploadProgressBar } from "@/components/knowledge-articles/UploadProgressBar";
import { MainHeader } from "@/components/MainHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ritaToast } from "@/components/ui/rita-toast";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type FileDocument,
	fileKeys,
	useDeleteFile,
	useDownloadFile,
	useFiles,
	useReprocessFile,
	useUploadFile,
} from "@/hooks/api/useFiles";
import { useDataSources } from "@/hooks/useDataSources";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import {
	SUPPORTED_DOCUMENT_TYPES,
	validateFileForUpload,
} from "@/lib/constants";
import { formatDateSafe } from "@/lib/date-utils";
import {
	formatFileSize,
	getSourceDatabaseValue,
	getSourceDisplayName,
} from "@/lib/format-utils";
import { renderSortIcon } from "@/lib/table-utils";
import type { DataSourceConnection } from "@/types/dataSource";

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
	const [deletingRemaining, setDeletingRemaining] = useState<number | null>(
		null,
	);
	const [uploadProgress, setUploadProgress] = useState<{
		total: number;
		current: number;
	} | null>(null);
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
	const {
		data: filesData,
		isLoading,
		error,
	} = useFiles({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		sortBy: sortField,
		sortOrder,
		search: searchQuery,
		status: statusFilter !== "All" ? statusFilter : undefined,
		source:
			sourceFilter !== "All" ? getSourceDatabaseValue(sourceFilter) : undefined,
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
				description:
					error instanceof Error
						? error.message
						: "Unable to fetch files. Please try again.",
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
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortOrder("desc");
		}
		setPage(0);
	};

	// Server-side filtering - no client-side filtering needed
	const sortedFiles = files;

	// Pagination handlers
	const handleNextPage = () => {
		if ((page + 1) * PAGE_SIZE < totalFiles) {
			setPage(page + 1);
			setSelectedFiles(new Set());
		}
	};

	const handlePrevPage = () => {
		if (page > 0) {
			setPage(page - 1);
			setSelectedFiles(new Set());
		}
	};

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
		setIsBulkDeleting(true);

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

		setIsBulkDeleting(false);
		setDeletingRemaining(null);
		setSelectedFiles(new Set());

		queryClient.invalidateQueries({
			queryKey: fileKeys.lists(),
			refetchType: "active",
		});

		if (failCount === 0) {
			ritaToast.success({
				title: t("toast:success.documentsDeleted"),
				description: t("toast:descriptions.deletedDocuments", {
					count: successCount,
				}),
			});
		} else if (successCount === 0) {
			ritaToast.error({
				title: t("toast:error.deleteFailed"),
				description: t("toast:descriptions.deletedFailed", {
					count: failCount,
				}),
			});
		} else {
			ritaToast.warning({
				title: t("toast:warning.partialSuccess"),
				description: t("toast:descriptions.partialDelete", {
					success: successCount,
					failed: failCount,
				}),
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

		const processingKey = "rita-processing-files";
		sessionStorage.setItem(
			processingKey,
			JSON.stringify({
				total: 0,
				processed: 0,
				failed: 0,
				duplicates: 0,
				uploading: true,
			}),
		);

		ritaToast.info({
			title: t("toast:info.uploadingFiles"),
			description: t("toast:descriptions.startingUpload", {
				count: filesToUpload.length,
			}),
		});

		if (filesToUpload.length > 1) {
			setUploadProgress({ total: filesToUpload.length, current: 0 });
		}

		for (let i = 0; i < filesToUpload.length; i++) {
			const file = filesToUpload[i];

			if (filesToUpload.length > 1) {
				setUploadProgress({ total: filesToUpload.length, current: i + 1 });
			}

			const validation = validateFileForUpload(file);
			if (!validation.isValid && validation.error) {
				errorCount++;
				errors.push(`${file.name}: ${validation.error.description}`);
				continue;
			}

			setUploadingFiles((prev) => new Set(prev).add(file.name));

			try {
				const response = await uploadFileMutation.mutateAsync(file);
				successCount++;
				successfulFilenames.push(response.document.filename);
			} catch (error: any) {
				if (error.status === 409 && error.data?.existing_filename) {
					duplicateCount++;
					duplicates.push(
						`${file.name}: Already exists as "${error.data.existing_filename}"`,
					);
				} else {
					errorCount++;
					errors.push(`${file.name}: ${error.message || "Upload failed"}`);
				}
			} finally {
				setUploadingFiles((prev) => {
					const next = new Set(prev);
					next.delete(file.name);
					return next;
				});
			}
		}

		setUploadProgress(null);

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}

		if (successCount > 0) {
			queryClient.invalidateQueries({
				queryKey: fileKeys.lists(),
				refetchType: "active",
			});
		}

		if (successCount > 0) {
			const currentData = JSON.parse(
				sessionStorage.getItem(processingKey) || "{}",
			);
			const processed = currentData.processed || 0;
			const failed = currentData.failed || 0;

			const trackingData = {
				total: successCount,
				processed,
				failed,
				duplicates: duplicateCount,
				uploading: false,
			};
			sessionStorage.setItem(processingKey, JSON.stringify(trackingData));

			if (processed + failed >= successCount) {
				const duplicateMsg =
					duplicateCount > 0
						? `, ${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""} skipped`
						: "";

				if (processed > 0 && failed === 0 && duplicateCount === 0) {
					ritaToast.success({
						title: t("toast:success.processingComplete"),
						description:
							processed === 1
								? t("toast:descriptions.fileProcessed")
								: t("toast:descriptions.allFilesProcessed"),
					});
				} else if (processed > 0 && failed === 0 && duplicateCount > 0) {
					ritaToast.success({
						title: t("toast:success.processingComplete"),
						description: t("toast:descriptions.filesProcessedDuplicates", {
							count: processed,
							duplicates: duplicateCount,
						}),
					});
				} else if (processed === 0 && failed > 0) {
					ritaToast.error({
						title: t("toast:error.processingFailed"),
						description:
							failed === 1
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
				queryClient.invalidateQueries({
					queryKey: fileKeys.lists(),
					refetchType: "active",
				});
			}
		} else {
			sessionStorage.removeItem(processingKey);
		}

		if (successCount > 0 && errorCount === 0 && duplicateCount === 0) {
			ritaToast.info({
				title: t("toast:success.filesUploaded"),
				description: t("toast:descriptions.uploadedProcessing", {
					count: successCount,
				}),
			});
		} else if (successCount > 0 && duplicateCount > 0 && errorCount === 0) {
			ritaToast.warning({
				title: t("toast:success.filesUploaded"),
				description: t("toast:descriptions.uploadedWithDuplicates", {
					success: successCount,
					duplicates: duplicateCount,
				}),
			});
		} else if (successCount > 0 && errorCount > 0) {
			ritaToast.warning({
				title: t("toast:warning.someFilesUploaded"),
				description:
					duplicateCount > 0
						? t("toast:descriptions.uploadedWithErrorsAndDuplicates", {
								success: successCount,
								failed: errorCount,
								duplicates: duplicateCount,
							})
						: t("toast:descriptions.uploadedWithErrors", {
								success: successCount,
								failed: errorCount,
							}),
			});
		} else if (errorCount > 0 || duplicateCount > 0) {
			if (duplicateCount > 0 && errorCount === 0) {
				ritaToast.warning({
					title: t("toast:warning.filesAlreadyExist"),
					description: t("toast:descriptions.filesAlreadyExist", {
						count: duplicateCount,
					}),
				});
			} else if (duplicateCount > 0 && errorCount > 0) {
				ritaToast.error({
					title: t("toast:error.uploadFailed"),
					description: t("toast:descriptions.uploadErrorsAndDuplicates", {
						errors: errorCount,
						duplicates: duplicateCount,
					}),
				});
			} else {
				ritaToast.error({
					title: t("toast:error.uploadFailed"),
					description:
						errors.length > 0
							? errors[0]
							: t("toast:descriptions.uploadAllFailed"),
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
						description: t("toast:descriptions.downloading", {
							name: file.filename,
						}),
					});
				},
				onError: () => {
					ritaToast.error({
						title: t("toast:error.downloadFailed"),
						description: t("toast:descriptions.downloadFailed", {
							name: file.filename,
						}),
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
					description: t("toast:descriptions.reprocessing", {
						name: file.filename,
					}),
				});
			},
			onError: () => {
				ritaToast.error({
					title: t("toast:error.reprocessFailed"),
					description: t("toast:descriptions.reprocessFailed", {
						name: file.filename,
					}),
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
						description: t("toast:descriptions.documentDeleted", {
							name: fileName,
						}),
					});
				},
				onError: () => {
					ritaToast.error({
						title: t("toast:error.deleteFailed"),
						description: t("toast:descriptions.documentDeleteFailed", {
							name: fileName,
						}),
					});
				},
			});
			setDeleteDialogOpen(false);
			setFileToDelete(null);
		}
	};

	const hasActiveFilters =
		searchInput !== "" || statusFilter !== "All" || sourceFilter !== "All";

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<MainHeader
				title={t("header.title")}
				action={
					<AddKnowledgeMenu
						onUploadClick={handleUploadClick}
						onNavigate={navigate}
						syncedSources={syncedSources}
						isUploading={uploadFileMutation.isPending}
						uploadingCount={uploadingFiles.size}
					/>
				}
			/>

			{/* Main Content */}
			<div className="flex-1 px-6 py-6 overflow-y-auto">
				<div className="flex flex-col gap-6">
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
								<FileSourceFilter
									value={sourceFilter}
									onChange={setSourceFilter}
								/>
								<FileStatusFilter
									value={statusFilter}
									onChange={setStatusFilter}
								/>
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
						<UploadProgressBar
							current={uploadProgress.current}
							total={uploadProgress.total}
						/>
					)}

					{/* Empty State */}
					{!isLoading && sortedFiles.length === 0 ? (
						<EmptyFilesState
							hasActiveFilters={hasActiveFilters}
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
									{isLoading ? (
										<FilesTableSkeleton />
									) : (
										sortedFiles.map((file) => (
											<TableRow key={file.id}>
												<TableCell className="w-12">
													<Checkbox
														checked={selectedFiles.has(file.id)}
														onCheckedChange={() => handleSelectFile(file.id)}
													/>
												</TableCell>
												<TableCell>{file.filename}</TableCell>
												<TableCell>
													<FileStatusBadge
														status={file.status}
														onRetry={() => handleReprocess(file)}
														isRetrying={reprocessFileMutation.isPending}
													/>
												</TableCell>
												<TableCell>
													{getSourceDisplayName(file.source)}
												</TableCell>
												<TableCell className="text-right">
													{formatFileSize(file.size)}
												</TableCell>
												<TableCell className="text-right">
													{formatDateSafe(file.updated_at)}
												</TableCell>
												<TableCell className="w-16">
													<FileRowActionMenu
														file={file}
														onDownload={handleDownload}
														onReprocess={handleReprocess}
														onDelete={handleDelete}
														isReprocessing={reprocessFileMutation.isPending}
														isDeleting={deleteFileMutation.isPending}
													/>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					)}

					{/* Footer with Pagination */}
					{!isLoading && sortedFiles.length > 0 && (
						<FilesPagination
							page={page}
							pageSize={PAGE_SIZE}
							total={totalFiles}
							hasFilters={hasActiveFilters}
							filteredCount={sortedFiles.length}
							onPrevious={handlePrevPage}
							onNext={handleNextPage}
						/>
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
				description={t("dialogs.deleteDescription", {
					filename: fileToDelete?.filename,
				})}
				onConfirm={confirmDelete}
				confirmLabel={t("actions.delete")}
				variant="destructive"
			/>

			{/* Bulk Delete Confirmation Dialog */}
			<ConfirmDialog
				open={bulkDeleteDialogOpen}
				onOpenChange={setBulkDeleteDialogOpen}
				title={t("dialogs.bulkDeleteTitle")}
				description={t("dialogs.bulkDeleteDescription", {
					count: selectedFiles.size,
				})}
				onConfirm={handleConfirmBulkDelete}
				confirmLabel={t("actions.delete")}
				variant="destructive"
			/>
		</div>
	);
}
