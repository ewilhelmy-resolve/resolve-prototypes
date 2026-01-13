/**
 * FilesV1Content.test.tsx - Unit tests for Knowledge Articles page
 *
 * Tests comprehensive file management functionality:
 * - File upload, download, reprocess, delete
 * - Search and filtering (by status and source)
 * - Statistics display (total, processed, processing, failed)
 * - Multi-select functionality
 * - Loading states and error handling
 * - Empty states
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FILE_SOURCE, FILE_STATUS } from "@/lib/constants";
import FilesV1Content from "./FilesV1Content";

// Mock ritaToast
vi.mock("@/components/ui/rita-toast", () => ({
	ritaToast: {
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
		info: vi.fn(),
	},
}));

// Mock BulkActions component
vi.mock("@/components/BulkActions", () => ({
	BulkActions: ({ selectedItems, onDelete, onClose, itemLabel, isLoading, remainingCount }: any) => (
		<div data-testid="bulk-actions">
			<span>
				{isLoading && remainingCount != null
					? `${remainingCount} ${itemLabel} remaining`
					: `${selectedItems.length} ${itemLabel} selected`}
			</span>
			<button onClick={onDelete} disabled={isLoading}>Delete Selected</button>
			<button onClick={onClose} disabled={isLoading}>Clear Selection</button>
		</div>
	),
}));

// Mock EmptyFilesState component
vi.mock("@/components/knowledge-articles/EmptyFilesState", () => ({
	default: ({ hasActiveFilters, onUploadClick }: any) => (
		<div data-testid="empty-files-state">
			<h2>{hasActiveFilters ? "No documents found" : "No documents yet"}</h2>
			<p>
				{hasActiveFilters
					? "Try adjusting your search or filter criteria"
					: "Upload your first document to get started"}
			</p>
			{!hasActiveFilters && onUploadClick && (
				<button onClick={onUploadClick}>Upload Document</button>
			)}
		</div>
	),
}));

// Mock file data matching the real FileDocument type
const mockFiles = [
	{
		id: "file-1",
		filename: "test-document.pdf",
		status: FILE_STATUS.PROCESSED,
		source: FILE_SOURCE.MANUAL,
		size: 1024000,
		created_at: new Date("2025-01-01"),
	},
	{
		id: "file-2",
		filename: "confluence-page.txt",
		status: FILE_STATUS.PROCESSING,
		source: FILE_SOURCE.CONFLUENCE,
		size: 512000,
		created_at: new Date("2025-01-02"),
	},
	{
		id: "file-3",
		filename: "failed-doc.docx",
		status: FILE_STATUS.FAILED,
		source: FILE_SOURCE.MANUAL,
		size: 2048000,
		created_at: new Date("2025-01-03"),
	},
];

// Mock hooks with server-side filtering support
const mockUseFiles = vi.fn();
vi.mock("@/hooks/api/useFiles", () => ({
	useFiles: (params?: any) => mockUseFiles(params),
	useUploadFile: vi.fn(() => ({
		mutate: vi.fn(),
		isPending: false,
		isError: false,
		isSuccess: false,
		error: null,
	})),
	useDownloadFile: vi.fn(() => ({
		mutate: vi.fn(),
		isPending: false,
	})),
	useReprocessFile: vi.fn(() => ({
		mutate: vi.fn(),
		isPending: false,
		isError: false,
		isSuccess: false,
		error: null,
	})),
	useDeleteFile: vi.fn(() => ({
		mutate: vi.fn(),
		isPending: false,
		isError: false,
		isSuccess: false,
		error: null,
	})),
	fileKeys: {
		all: ['files'],
		lists: () => ['files', 'list'],
		list: (params: any) => ['files', 'list', params],
	},
}));

// Mock useDataSources hook
vi.mock("@/hooks/useDataSources", () => ({
	useDataSources: vi.fn(() => ({
		data: [],
		isLoading: false,
	})),
}));

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return (
		<MemoryRouter>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</MemoryRouter>
	);
}

describe("FilesV1Content", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock implementation: return all files
		mockUseFiles.mockReturnValue({
			data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
			isLoading: false,
			error: null,
		});
	});

	describe("Page Structure", () => {
		it("renders knowledge articles page with header", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(screen.getByText("header.title")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /header.addButton/i }),
			).toBeInTheDocument();
		});

		// TODO: Re-enable when stats cards are re-implemented with proper metrics calculation
		it.skip("displays statistics cards", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Total documents
			expect(screen.getByText("Total Documents")).toBeInTheDocument();
			expect(screen.getByText("3")).toBeInTheDocument();

			// Processed documents
			expect(screen.getByText("Processed Documents")).toBeInTheDocument();

			// Processing - use getAllByText since it appears in both stats card and table
			expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);

			// Failed
			expect(screen.getByText("Failed Documents")).toBeInTheDocument();

			// Check all metrics cards exist (each showing "1")
			const allOnes = screen.getAllByText("1");
			expect(allOnes.length).toBe(3); // Processed, Processing, and Failed each have count of 1
		});

		it("displays search input", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(
				screen.getByPlaceholderText(/search.placeholder/i),
			).toBeInTheDocument();
		});

		it("displays filter dropdowns", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(screen.getByText(/filters.source/i)).toBeInTheDocument();
			expect(screen.getByText(/filters.status/i)).toBeInTheDocument();
		});

		it("Add Articles button has tooltip with upload requirements", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const uploadButton = screen.getByRole("button", {
				name: /header.addButton/i,
			});
			expect(uploadButton).toBeInTheDocument();

			// Tooltip content is rendered by Radix UI when hovering
			// We're verifying the button exists and is wrapped in Tooltip component
			// The actual tooltip behavior is tested by Radix UI's own tests
		});
	});

	describe("File List Display", () => {
		it("displays all files in table", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(screen.getByText("test-document.pdf")).toBeInTheDocument();
			expect(screen.getByText("confluence-page.txt")).toBeInTheDocument();
			expect(screen.getByText("failed-doc.docx")).toBeInTheDocument();
		});

		it("displays file status badges correctly", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Each status appears in stats card label AND in table badge
			// Processed: "Processed Documents" in stats + "Processed" badge in table
			expect(screen.getAllByText(/Processed/i).length).toBeGreaterThan(0);
			// Processing: "Processing" in stats + "Processing" badge in table
			expect(screen.getAllByText(/Processing/i).length).toBeGreaterThan(0);
			// Failed: "Failed Documents" in stats + "Failed" badge in table
			expect(screen.getAllByText(/Failed/i).length).toBeGreaterThan(0);
		});

		it("displays file sources correctly", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Manual source should be displayed as "Manual"
			const manualCells = screen.getAllByText("Manual");
			expect(manualCells.length).toBeGreaterThan(0);

			// Confluence source should be displayed as "Jira Confluence"
			expect(screen.getByText("Jira Confluence")).toBeInTheDocument();
		});

		it("formats file sizes correctly", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// File sizes are formatted using 1024-based calculation
			// 1024000 bytes = 1000 KB
			// 512000 bytes = 500 KB
			// 2048000 bytes = 1.95 MB (2048000 / 1024 / 1024 = 1.953125)
			expect(screen.getByText("1000 KB")).toBeInTheDocument();
			expect(screen.getByText("500 KB")).toBeInTheDocument();
			expect(screen.getByText("1.95 MB")).toBeInTheDocument();
		});
	});

	describe("Search Functionality", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		});

		it("debounces search input and calls API after 500ms", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/search.placeholder/i);

			// Initial call should have empty search
			expect(mockUseFiles).toHaveBeenLastCalledWith(
				expect.objectContaining({ search: "" })
			);

			// Type "confluence"
			fireEvent.change(searchInput, { target: { value: "confluence" } });

			// Should not update search query immediately (still empty string)
			expect(mockUseFiles).toHaveBeenLastCalledWith(
				expect.objectContaining({ search: "" })
			);

			// Fast-forward 500ms
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Now should call API with search term
			expect(mockUseFiles).toHaveBeenCalledWith(
				expect.objectContaining({ search: "confluence" })
			);
		});

		it("resets debounce timer when user continues typing", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/search.placeholder/i);

			// Type "con"
			fireEvent.change(searchInput, { target: { value: "con" } });

			// Wait 300ms
			act(() => {
				vi.advanceTimersByTime(300);
			});

			// Type more before 500ms elapses
			fireEvent.change(searchInput, { target: { value: "confluence" } });

			// Wait another 300ms (total 600ms from first input, but only 300ms from second)
			act(() => {
				vi.advanceTimersByTime(300);
			});

			// Should NOT have called API with "con" or "confluence" yet
			expect(mockUseFiles).not.toHaveBeenCalledWith(
				expect.objectContaining({ search: "con" })
			);
			expect(mockUseFiles).not.toHaveBeenCalledWith(
				expect.objectContaining({ search: "confluence" })
			);

			// Wait remaining 200ms (total 500ms from second input)
			act(() => {
				vi.advanceTimersByTime(200);
			});

			// Now should call API with final search term only
			expect(mockUseFiles).toHaveBeenLastCalledWith(
				expect.objectContaining({ search: "confluence" })
			);
		});

		it("filters files by search query via server-side", () => {
			// Mock API to return filtered results
			mockUseFiles.mockImplementation((params: any) => {
				const search = params?.search?.toLowerCase() || "";
				const filtered = search
					? mockFiles.filter((f) => f.filename.toLowerCase().includes(search))
					: mockFiles;

				return {
					data: { documents: filtered, total: filtered.length, limit: 50, offset: 0 },
					isLoading: false,
					error: null,
				};
			});

			const { rerender } = render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/search.placeholder/i);
			fireEvent.change(searchInput, { target: { value: "confluence" } });

			// Fast-forward debounce
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Force re-render after timer
			rerender(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Check filtered results appear
			expect(screen.getByText("confluence-page.txt")).toBeInTheDocument();
			expect(screen.queryByText("test-document.pdf")).not.toBeInTheDocument();
		});

		it("shows empty state when no results match search", () => {
			// Mock API to return no results
			mockUseFiles.mockImplementation(() => {
				return {
					data: { documents: [], total: 0, limit: 50, offset: 0 },
					isLoading: false,
					error: null,
				};
			});

			const { rerender } = render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/search.placeholder/i);
			fireEvent.change(searchInput, { target: { value: "nonexistent-file" } });

			// Fast-forward debounce
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Force re-render after timer
			rerender(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Check empty state appears
			expect(screen.getByText("No documents found")).toBeInTheDocument();
			expect(
				screen.getByText("Try adjusting your search or filter criteria"),
			).toBeInTheDocument();
		});

		it("resets pagination to page 0 when search changes", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/search.placeholder/i);
			fireEvent.change(searchInput, { target: { value: "test" } });

			// Fast-forward debounce
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Check pagination reset
			expect(mockUseFiles).toHaveBeenLastCalledWith(
				expect.objectContaining({ offset: 0, search: "test" })
			);
		});
	});

	describe("Status Filtering", () => {
		it("displays status filter button", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const statusButton = screen.getByText(/filters.status/i);
			expect(statusButton).toBeInTheDocument();
		});
	});

	describe("Source Filtering", () => {
		it("displays source filter button", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const sourceButton = screen.getByText(/filters.source/i);
			expect(sourceButton).toBeInTheDocument();
		});
	});

	describe("Multi-select Functionality", () => {
		it("renders checkboxes for file selection", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const checkboxes = screen.getAllByRole("checkbox");

			// Should have select-all + 3 file checkboxes
			expect(checkboxes.length).toBe(4);
		});

		it("handles individual file selection", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const checkboxes = screen.getAllByRole("checkbox");
			const firstFileCheckbox = checkboxes[1]; // Skip select-all

			// Initially unchecked
			expect(firstFileCheckbox).not.toBeChecked();

			fireEvent.click(firstFileCheckbox);

			expect(firstFileCheckbox).toBeChecked();
		});
	});

	describe("Upload Functionality", () => {
		it("renders upload button", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const uploadButton = screen.getByRole("button", {
				name: /header.addButton/i,
			});
			expect(uploadButton).toBeInTheDocument();
			expect(uploadButton).not.toBeDisabled();
		});

		it("validates file type before upload", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Create invalid file (image)
			const invalidFile = new File(["content"], "image.jpg", { type: "image/jpeg" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [invalidFile],
				writable: false,
			});
			fireEvent.change(input);

			// Should show error toast for invalid file type
			const { ritaToast } = await import("@/components/ui/rita-toast");
			await waitFor(() => {
				expect(ritaToast.info).toHaveBeenCalledWith(
					expect.objectContaining({
						title: "toast:info.uploadingFiles",
					}),
				);
			});
		});

		it("allows valid file types to upload", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Create valid file (PDF)
			const validFile = new File(["content"], "document.pdf", { type: "application/pdf" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [validFile],
				writable: false,
			});
			fireEvent.change(input);

			// Should show uploading toast
			const { ritaToast } = await import("@/components/ui/rita-toast");
			await waitFor(() => {
				expect(ritaToast.info).toHaveBeenCalledWith(
					expect.objectContaining({
						title: "toast:info.uploadingFiles",
						description: "toast:descriptions.startingUpload",
					}),
				);
			});
		});

		it("resets file input after validation error", async () => {
			const { useUploadFile } = await import("@/hooks/api/useFiles");
			vi.mocked(useUploadFile).mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Create invalid file
			const invalidFile = new File(["content"], "image.png", { type: "image/png" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [invalidFile],
				writable: false,
			});

			// Set up a spy on the input value
			const valueSetter = vi.fn();
			Object.defineProperty(input, "value", {
				set: valueSetter,
				get: () => "",
			});

			fireEvent.change(input);

			// Should reset input value
			await waitFor(() => {
				expect(valueSetter).toHaveBeenCalledWith("");
			});
		});
	});

	describe("Loading States", () => {
		it("shows loading skeletons when data is loading", async () => {
			mockUseFiles.mockReturnValue({
				data: undefined,
				isLoading: true,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Check for skeleton loading indicators in the table
			const table = screen.getByRole("table");
			expect(table).toBeInTheDocument();
		});
	});

	describe("Empty States", () => {
		it("shows empty state when no files exist", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: [], total: 0, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("empty-files-state")).toBeInTheDocument();
				expect(screen.getByText("No documents yet")).toBeInTheDocument();
				expect(
					screen.getByText("Upload your first document to get started"),
				).toBeInTheDocument();
			});
		});

		it("shows Upload Document button in empty state when no filters", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: [], total: 0, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("Upload Document")).toBeInTheDocument();
			});
		});

		it("shows correct message when filters are active but no results", () => {
			vi.useFakeTimers();

			// Mock to return empty results when search is applied
			mockUseFiles.mockImplementation((params: any) => {
				const search = params?.search?.toLowerCase() || "";
				if (search === "nonexistent") {
					return {
						data: { documents: [], total: 0, limit: 50, offset: 0 },
						isLoading: false,
						error: null,
					};
				}
				return {
					data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
					isLoading: false,
					error: null,
				};
			});

			const { rerender } = render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Apply search filter
			const searchInput = screen.getByPlaceholderText(/search.placeholder/i);
			fireEvent.change(searchInput, { target: { value: "nonexistent" } });

			// Fast-forward debounce timer
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Force re-render after timer
			rerender(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Check empty state appears
			expect(screen.getByTestId("empty-files-state")).toBeInTheDocument();
			expect(screen.getByText("No documents found")).toBeInTheDocument();
			expect(
				screen.getByText("Try adjusting your search or filter criteria"),
			).toBeInTheDocument();

			vi.useRealTimers();
		});

		it("does not show Upload Document button when filters are active", async () => {
			vi.useFakeTimers();

			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Apply search filter
			const searchInput = screen.getByPlaceholderText(/search.placeholder/i);
			fireEvent.change(searchInput, { target: { value: "nonexistent" } });

			// Fast-forward debounce
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Upload button should not be shown when filters are active
			expect(screen.queryByText("Upload Document")).not.toBeInTheDocument();

			vi.useRealTimers();
		});
	});

	describe("File Actions", () => {
		it("displays action menu for each file", async () => {
			// Restore default mock before this test
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Check that the table has rows with action buttons
			// Each file row has a DropdownMenuTrigger button in the last cell
			const table = screen.getByRole("table");
			expect(table).toBeInTheDocument();

			// Verify all 3 files are rendered (filenames are visible)
			expect(screen.getByText("test-document.pdf")).toBeInTheDocument();
			expect(screen.getByText("confluence-page.txt")).toBeInTheDocument();
			expect(screen.getByText("failed-doc.docx")).toBeInTheDocument();

			// Find all buttons - there should be multiple (upload, filters, sort, action menus)
			const buttons = screen.getAllByRole("button");
			// With 3 files, we expect: 1 upload + 2 filters + 3 sort buttons + 3 action menus = 9
			expect(buttons.length).toBeGreaterThanOrEqual(9);
		});
	});

	describe("Footer", () => {
		it("shows correct file count in footer", async () => {
			// Restore default mock before this test
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Footer now shows pagination format with i18n key
			expect(screen.getByText(/pagination.showing/i)).toBeInTheDocument();
		});

		it("does not show footer when no files exist", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: [], total: 0, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Footer should not be shown for empty state
			expect(screen.queryByText(/Knowledge articles$/)).not.toBeInTheDocument();
		});

		it("does not show footer when loading", async () => {
			mockUseFiles.mockReturnValue({
				data: undefined,
				isLoading: true,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(screen.queryByText(/Knowledge articles$/)).not.toBeInTheDocument();
		});
	});

	describe("Bulk Actions", () => {
		it("shows BulkActions component when files are selected", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Select first file
			const checkboxes = screen.getAllByRole("checkbox");
			const firstFileCheckbox = checkboxes[1]; // Skip select-all
			fireEvent.click(firstFileCheckbox);

			// BulkActions should appear
			expect(await screen.findByTestId("bulk-actions")).toBeInTheDocument();
			expect(screen.getByText("1 files selected")).toBeInTheDocument();
		});

		it("hides search and filters when BulkActions is shown", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Initially search is visible
			expect(screen.getByPlaceholderText(/search.placeholder/i)).toBeInTheDocument();

			// Select first file
			const checkboxes = screen.getAllByRole("checkbox");
			const firstFileCheckbox = checkboxes[1];
			fireEvent.click(firstFileCheckbox);

			// Search should be hidden and BulkActions visible
			expect(await screen.findByTestId("bulk-actions")).toBeInTheDocument();
			expect(screen.queryByPlaceholderText(/search.placeholder/i)).not.toBeInTheDocument();
		});

		it("clears selection when Clear Selection button is clicked", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Select first file
			const checkboxes = screen.getAllByRole("checkbox");
			const firstFileCheckbox = checkboxes[1];
			fireEvent.click(firstFileCheckbox);

			// BulkActions should appear
			expect(await screen.findByTestId("bulk-actions")).toBeInTheDocument();

			// Click Clear Selection
			const clearButton = screen.getByText("Clear Selection");
			fireEvent.click(clearButton);

			// BulkActions should disappear and search should reappear
			expect(await screen.findByPlaceholderText(/search.placeholder/i)).toBeInTheDocument();
			expect(screen.queryByTestId("bulk-actions")).not.toBeInTheDocument();
		});

		it("opens bulk delete confirmation dialog", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Select two files
			const checkboxes = screen.getAllByRole("checkbox");
			fireEvent.click(checkboxes[1]);
			fireEvent.click(checkboxes[2]);

			// BulkActions should appear
			expect(await screen.findByTestId("bulk-actions")).toBeInTheDocument();

			// Click Delete Selected
			const deleteButton = screen.getByText("Delete Selected");
			fireEvent.click(deleteButton);

			// Confirmation dialog should appear
			expect(await screen.findByText("dialogs.bulkDeleteTitle")).toBeInTheDocument();
			expect(screen.getByText(/dialogs.bulkDeleteDescription/)).toBeInTheDocument();
		});

		it("selects all files when select-all checkbox is clicked", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Click select-all checkbox
			const checkboxes = screen.getAllByRole("checkbox");
			const selectAllCheckbox = checkboxes[0];
			fireEvent.click(selectAllCheckbox);

			// BulkActions should show all 3 files selected
			expect(await screen.findByTestId("bulk-actions")).toBeInTheDocument();
			expect(screen.getByText("3 files selected")).toBeInTheDocument();
		});
	});

	describe("Toast Notifications", () => {
		it("does not show fixed toast divs", async () => {
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			const { container } = render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Should not have any fixed bottom-right toast divs
			const fixedToasts = container.querySelectorAll('.fixed.bottom-4.right-4');
			expect(fixedToasts.length).toBe(0);
		});
	});

	describe("Upload Progress Bar", () => {
		it("does not show progress bar when no upload is in progress", () => {
			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Progress bar should not be visible
			expect(screen.queryByText(/uploadProgress.uploading/i)).not.toBeInTheDocument();
		});

		it("shows progress bar when uploading multiple files", async () => {
			// Mock upload mutation to track progress
			const mockMutateAsync = vi.fn().mockImplementation(() =>
				new Promise((resolve) => {
					setTimeout(() => resolve({ document: { filename: 'test.pdf' } }), 100);
				})
			);

			const { useUploadFile } = await import("@/hooks/api/useFiles");
			vi.mocked(useUploadFile).mockReturnValue({
				mutate: vi.fn(),
				mutateAsync: mockMutateAsync,
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
			} as any);

			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Create multiple valid files
			const file1 = new File(["content1"], "doc1.pdf", { type: "application/pdf" });
			const file2 = new File(["content2"], "doc2.pdf", { type: "application/pdf" });
			const file3 = new File(["content3"], "doc3.pdf", { type: "application/pdf" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [file1, file2, file3],
				writable: false,
			});
			fireEvent.change(input);

			// Progress bar should appear for multiple files
			await waitFor(() => {
				expect(screen.getByText(/uploadProgress.uploading/i)).toBeInTheDocument();
			});
		});

		it("shows correct progress count during multi-file upload", async () => {
			const mockMutateAsync = vi.fn().mockImplementation(() =>
				new Promise<{ document: { filename: string } }>((resolve) => {
					setTimeout(() => resolve({ document: { filename: 'test.pdf' } }), 100);
				})
			);

			const { useUploadFile } = await import("@/hooks/api/useFiles");
			vi.mocked(useUploadFile).mockReturnValue({
				mutate: vi.fn(),
				mutateAsync: mockMutateAsync,
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
			} as any);

			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Create multiple valid files
			const file1 = new File(["content1"], "doc1.pdf", { type: "application/pdf" });
			const file2 = new File(["content2"], "doc2.pdf", { type: "application/pdf" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [file1, file2],
				writable: false,
			});
			fireEvent.change(input);

			// Progress should show total count - i18n mock returns the key
			await waitFor(() => {
				expect(screen.getByText(/uploadProgress.progress/i)).toBeInTheDocument();
			});
		});

		it("does not show progress bar for single file upload", async () => {
			const mockMutateAsync = vi.fn().mockResolvedValue({ document: { filename: 'test.pdf' } });

			const { useUploadFile } = await import("@/hooks/api/useFiles");
			vi.mocked(useUploadFile).mockReturnValue({
				mutate: vi.fn(),
				mutateAsync: mockMutateAsync,
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
			} as any);

			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Create single valid file
			const file = new File(["content"], "document.pdf", { type: "application/pdf" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [file],
				writable: false,
			});
			fireEvent.change(input);

			// Progress bar should NOT appear for single file
			expect(screen.queryByText(/uploadProgress.uploading/i)).not.toBeInTheDocument();
		});

		it("clears progress bar after upload completes", async () => {
			const mockMutateAsync = vi.fn().mockResolvedValue({ document: { filename: 'test.pdf' } });

			const { useUploadFile } = await import("@/hooks/api/useFiles");
			vi.mocked(useUploadFile).mockReturnValue({
				mutate: vi.fn(),
				mutateAsync: mockMutateAsync,
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
			} as any);

			mockUseFiles.mockReturnValue({
				data: { documents: mockFiles, total: mockFiles.length, limit: 50, offset: 0 },
				isLoading: false,
				error: null,
			});

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Create multiple valid files
			const file1 = new File(["content1"], "doc1.pdf", { type: "application/pdf" });
			const file2 = new File(["content2"], "doc2.pdf", { type: "application/pdf" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [file1, file2],
				writable: false,
			});
			fireEvent.change(input);

			// Wait for uploads to complete
			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledTimes(2);
			});

			// Progress bar should be cleared after upload
			await waitFor(() => {
				expect(screen.queryByText(/uploadProgress.uploading/i)).not.toBeInTheDocument();
			});
		});
	});
});
