import type { FileDocument } from "@/hooks/api/useFiles";
import { FILE_SOURCE, FILE_STATUS } from "@/lib/constants";

export const mockManualProcessedFile: FileDocument = {
	id: "file-1",
	filename: "Product Documentation v2.pdf",
	size: 2457600,
	type: "application/pdf",
	status: FILE_STATUS.PROCESSED,
	source: FILE_SOURCE.MANUAL,
	created_at: new Date("2025-01-15T10:30:00Z"),
	updated_at: new Date("2025-01-15T10:35:00Z"),
};

export const mockManualUploadedFile: FileDocument = {
	id: "file-2",
	filename: "Support Guidelines.docx",
	size: 524288,
	type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	status: FILE_STATUS.UPLOADED,
	source: FILE_SOURCE.MANUAL,
	created_at: new Date("2025-01-14T15:45:00Z"),
	updated_at: new Date("2025-01-14T15:45:00Z"),
};

export const mockProcessingFile: FileDocument = {
	id: "file-3",
	filename: "Training Manual 2025.pdf",
	size: 5242880,
	type: "application/pdf",
	status: FILE_STATUS.PROCESSING,
	source: FILE_SOURCE.MANUAL,
	created_at: new Date("2025-01-16T09:00:00Z"),
	updated_at: new Date("2025-01-16T09:01:00Z"),
};

export const mockFailedFile: FileDocument = {
	id: "file-4",
	filename: "Corrupted Report.pdf",
	size: 1048576,
	type: "application/pdf",
	status: FILE_STATUS.FAILED,
	source: FILE_SOURCE.MANUAL,
	metadata: { error: "Failed to extract text content" },
	created_at: new Date("2025-01-13T14:00:00Z"),
	updated_at: new Date("2025-01-13T14:02:00Z"),
};

export const mockConfluenceFile: FileDocument = {
	id: "file-5",
	filename: "API Integration Guide",
	size: 3145728,
	type: "text/html",
	status: FILE_STATUS.PROCESSED,
	source: FILE_SOURCE.CONFLUENCE,
	created_at: new Date("2025-01-12T08:00:00Z"),
	updated_at: new Date("2025-01-12T08:15:00Z"),
};

export const mockPendingFile: FileDocument = {
	id: "file-6",
	filename: "Onboarding Checklist.md",
	size: 8192,
	type: "text/markdown",
	status: FILE_STATUS.PENDING as FileDocument["status"],
	source: FILE_SOURCE.MANUAL,
	created_at: new Date("2025-01-16T11:00:00Z"),
	updated_at: new Date("2025-01-16T11:00:00Z"),
};

export const mockSyncingFile: FileDocument = {
	id: "file-7",
	filename: "Release Notes Q1",
	size: 0,
	type: "text/html",
	status: FILE_STATUS.SYNCING as FileDocument["status"],
	source: FILE_SOURCE.CONFLUENCE,
	created_at: new Date("2025-01-16T12:00:00Z"),
	updated_at: new Date("2025-01-16T12:00:00Z"),
};

export const mockSyncedSources = [
	{
		id: "src-1",
		type: "confluence",
		enabled: true,
		last_sync_status: "completed",
	},
	{
		id: "src-2",
		type: "sharepoint",
		enabled: true,
		last_sync_status: "completed",
	},
];
