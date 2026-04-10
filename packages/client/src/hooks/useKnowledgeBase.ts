/**
 * useKnowledgeBase - Handle knowledge base functionality
 *
 * Encapsulates document upload for knowledge articles, navigation,
 * and knowledge base state management.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ritaToast } from "@/components/custom/rita-toast";
import {
	type FileDocument,
	fileKeys,
	useFiles,
	useUploadFile,
} from "@/hooks/api/useFiles";
import { validateFileForUpload } from "@/lib/constants";

export interface KnowledgeBaseState {
	// Upload state
	isUploading: boolean;
	isError: boolean;
	isSuccess: boolean;
	error: any;
	uploadingFiles: Set<string>;

	// Files state
	files: FileDocument[];
	filesLoading: boolean;
	totalFiles: number;

	// Upload actions
	handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
	openDocumentSelector: () => void;

	// Navigation actions
	navigateToKnowledgeArticles: () => void;
	navigateToFiles: () => void;

	// Refs
	documentInputRef: React.RefObject<HTMLInputElement>;
}

/**
 * Custom hook for handling knowledge base functionality
 */
export const useKnowledgeBase = (): KnowledgeBaseState => {
	const { t } = useTranslation(["kbs"]);
	const documentInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const uploadFileMutation = useUploadFile();
	const { data: filesData, isLoading: filesLoading } = useFiles();
	const queryClient = useQueryClient();
	const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

	const handleDocumentUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const filesToUpload = Array.from(files);
		let successCount = 0;
		let errorCount = 0;
		const errors: string[] = [];
		const successfulFilenames: string[] = [];

		// Show initial toast
		ritaToast.info({
			title: t("kbs:uploadToast.startTitle"),
			description: t("kbs:uploadToast.startDescription", {
				count: filesToUpload.length,
			}),
		});

		// Process each file
		for (const file of filesToUpload) {
			// Validate file before upload
			const validation = validateFileForUpload(file);
			if (!validation.isValid && validation.errorCode) {
				errorCount++;
				errors.push(
					`${file.name}: ${t(`kbs:errors.${validation.errorCode}.description`, validation.errorParams)}`,
				);
				continue;
			}

			// Track uploading state for UI feedback
			setUploadingFiles((prev) => new Set(prev).add(file.name));

			try {
				// Upload with options to skip mutation's onSuccess callback (prevents individual cache invalidation)
				const response = await uploadFileMutation.mutateAsync(file, {
					onSuccess: () => {
						// Skip individual success handling - we'll handle it in the summary
					},
				});
				successCount++;
				// Use server's returned filename (not client's file.name) for SSE tracking
				successfulFilenames.push(response.document.filename);
			} catch (error: any) {
				errorCount++;
				// Handle duplicate file (409 Conflict)
				if (error.status === 409 && error.data?.existing_filename) {
					errors.push(
						`${file.name}: ${t("kbs:uploadToast.duplicateError", { filename: error.data.existing_filename })}`,
					);
				} else {
					errors.push(
						`${file.name}: ${error.message || t("kbs:uploadToast.genericError")}`,
					);
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

		// Reset file input to allow re-selection
		if (e.target) {
			e.target.value = "";
		}

		// Invalidate files query cache if any files were uploaded successfully
		if (successCount > 0) {
			queryClient.invalidateQueries({ queryKey: fileKeys.lists() });

			// Initialize processing tracking for summary toast
			const processingKey = "rita-processing-files";

			// Clear any stale tracking data before initializing new batch
			sessionStorage.removeItem(processingKey);

			const trackingData = {
				filenames: successfulFilenames, // Server's returned filenames (may differ from client's)
				processed: 0,
				failed: 0,
			};

			sessionStorage.setItem(processingKey, JSON.stringify(trackingData));
		}

		// Show final summary toast
		if (successCount > 0 && errorCount === 0) {
			ritaToast.success({
				title: t("kbs:uploadToast.successTitle"),
				description: t("kbs:uploadToast.successDescription", {
					count: successCount,
				}),
			});
		} else if (successCount > 0 && errorCount > 0) {
			ritaToast.warning({
				title: t("kbs:uploadToast.partialTitle"),
				description: t("kbs:uploadToast.partialDescription", {
					successCount,
					errorCount,
				}),
			});
		} else if (errorCount > 0) {
			ritaToast.error({
				title: t("kbs:uploadToast.failedTitle"),
				description:
					errors.length > 0
						? errors[0]
						: t("kbs:uploadToast.failedAllDescription"),
			});
		}
	};

	const openDocumentSelector = () => {
		documentInputRef.current?.click();
	};

	const navigateToKnowledgeArticles = () => {
		navigate("/content");
	};

	const navigateToFiles = () => {
		navigate("/content");
	};

	return {
		// Upload state
		isUploading: uploadFileMutation.isPending || uploadingFiles.size > 0,
		isError: uploadFileMutation.isError,
		isSuccess: uploadFileMutation.isSuccess,
		error: uploadFileMutation.error,
		uploadingFiles,

		// Files state
		files: filesData?.documents || [],
		filesLoading,
		totalFiles: filesData?.total || 0,

		// Upload actions
		handleDocumentUpload,
		openDocumentSelector,

		// Navigation actions
		navigateToKnowledgeArticles,
		navigateToFiles,

		// Refs
		documentInputRef,
	};
};
