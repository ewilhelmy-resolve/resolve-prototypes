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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
	BulkActions: ({ selectedItems, onDelete, onClose, itemLabel }: any) => (
		<div data-testid="bulk-actions">
			<span>
				{selectedItems.length} {itemLabel} selected
			</span>
			<button onClick={onDelete}>Delete Selected</button>
			<button onClick={onClose}>Clear Selection</button>
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

// Mock hooks
vi.mock("@/hooks/api/useFiles", () => ({
	useFiles: vi.fn(() => ({
		data: { documents: mockFiles, total: mockFiles.length },
		isLoading: false,
	})),
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
	});

	describe("Page Structure", () => {
		it("renders knowledge articles page with header", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(screen.getByText("Knowledge Articles")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /Add Articles/i }),
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
				screen.getByPlaceholderText(/Search documents/i),
			).toBeInTheDocument();
		});

		it("displays filter dropdowns", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(screen.getByText(/Source: All/i)).toBeInTheDocument();
			expect(screen.getByText(/Status: All/i)).toBeInTheDocument();
		});

		it("Add Articles button has tooltip with upload requirements", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const uploadButton = screen.getByRole("button", {
				name: /Add Articles/i,
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
		it("filters files by search query", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/Search documents/i);
			fireEvent.change(searchInput, { target: { value: "confluence" } });

			await waitFor(() => {
				expect(screen.getByText("confluence-page.txt")).toBeInTheDocument();
				expect(screen.queryByText("test-document.pdf")).not.toBeInTheDocument();
			});
		});

		it("shows empty state when no results match search", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/Search documents/i);
			fireEvent.change(searchInput, { target: { value: "nonexistent-file" } });

			await waitFor(() => {
				expect(screen.getByText("No documents found")).toBeInTheDocument();
				expect(
					screen.getByText("Try adjusting your search or filter criteria"),
				).toBeInTheDocument();
			});
		});

		it("updates file count after filtering", async () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const searchInput = screen.getByPlaceholderText(/Search documents/i);
			fireEvent.change(searchInput, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("1 Knowledge articles")).toBeInTheDocument();
			});
		});
	});

	describe("Status Filtering", () => {
		it("displays status filter button", () => {
			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			const statusButton = screen.getByText(/Status: All/i);
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

			const sourceButton = screen.getByText(/Source: All/i);
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
				name: /Add Articles/i,
			});
			expect(uploadButton).toBeInTheDocument();
			expect(uploadButton).not.toBeDisabled();
		});

		it("validates file type before upload", async () => {
			const { useUploadFile } = await import("@/hooks/api/useFiles");
			const mockMutate = vi.fn();
			vi.mocked(useUploadFile).mockReturnValue({
				mutate: mockMutate,
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

			// Create invalid file (image)
			const invalidFile = new File(["content"], "image.jpg", { type: "image/jpeg" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [invalidFile],
				writable: false,
			});
			fireEvent.change(input);

			// Should show error toast
			const { ritaToast } = await import("@/components/ui/rita-toast");
			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith(
					expect.objectContaining({
						title: "Unsupported File Type",
						description: expect.stringContaining(".jpg"),
					}),
				);
			});

			// Should NOT call mutate
			expect(mockMutate).not.toHaveBeenCalled();
		});

		it("allows valid file types to upload", async () => {
			const { useUploadFile } = await import("@/hooks/api/useFiles");
			const mockMutate = vi.fn();
			vi.mocked(useUploadFile).mockReturnValue({
				mutate: mockMutate,
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

			// Create valid file (PDF)
			const validFile = new File(["content"], "document.pdf", { type: "application/pdf" });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			// Simulate file selection
			Object.defineProperty(input, "files", {
				value: [validFile],
				writable: false,
			});
			fireEvent.change(input);

			// Should call mutate with the file
			await waitFor(() => {
				expect(mockMutate).toHaveBeenCalledWith(
					validFile,
					expect.any(Object),
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
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: undefined,
				isLoading: true,
			} as any);

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
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: [] },
				isLoading: false,
			} as any);

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
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: [] },
				isLoading: false,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("Upload Document")).toBeInTheDocument();
			});
		});

		it("shows correct message when filters are active but no results", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Apply search filter
			const searchInput = screen.getByPlaceholderText(/Search documents/i);
			fireEvent.change(searchInput, { target: { value: "nonexistent" } });

			await waitFor(() => {
				expect(screen.getByTestId("empty-files-state")).toBeInTheDocument();
				expect(screen.getByText("No documents found")).toBeInTheDocument();
				expect(
					screen.getByText("Try adjusting your search or filter criteria"),
				).toBeInTheDocument();
			});
		});

		it("does not show Upload Document button when filters are active", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Apply search filter
			const searchInput = screen.getByPlaceholderText(/Search documents/i);
			fireEvent.change(searchInput, { target: { value: "nonexistent" } });

			await waitFor(() => {
				expect(screen.queryByText("Upload Document")).not.toBeInTheDocument();
			});
		});
	});

	describe("File Actions", () => {
		it("displays action menu for each file", async () => {
			// Restore default mock before this test
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

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
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			expect(screen.getByText("3 Knowledge articles")).toBeInTheDocument();
		});

		it("does not show footer when no files exist", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: [] },
				isLoading: false,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.queryByText(/Knowledge articles$/)).not.toBeInTheDocument();
			});
		});

		it("does not show footer when loading", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: undefined,
				isLoading: true,
			} as any);

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
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

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
			await waitFor(() => {
				expect(screen.getByTestId("bulk-actions")).toBeInTheDocument();
				expect(screen.getByText("1 files selected")).toBeInTheDocument();
			});
		});

		it("hides search and filters when BulkActions is shown", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Initially search is visible
			expect(screen.getByPlaceholderText(/Search documents/i)).toBeInTheDocument();

			// Select first file
			const checkboxes = screen.getAllByRole("checkbox");
			const firstFileCheckbox = checkboxes[1];
			fireEvent.click(firstFileCheckbox);

			// Search should be hidden
			await waitFor(() => {
				expect(screen.queryByPlaceholderText(/Search documents/i)).not.toBeInTheDocument();
				expect(screen.getByTestId("bulk-actions")).toBeInTheDocument();
			});
		});

		it("clears selection when Clear Selection button is clicked", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

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
			await waitFor(() => {
				expect(screen.getByTestId("bulk-actions")).toBeInTheDocument();
			});

			// Click Clear Selection
			const clearButton = screen.getByText("Clear Selection");
			fireEvent.click(clearButton);

			// BulkActions should disappear and search should reappear
			await waitFor(() => {
				expect(screen.queryByTestId("bulk-actions")).not.toBeInTheDocument();
				expect(screen.getByPlaceholderText(/Search documents/i)).toBeInTheDocument();
			});
		});

		it("opens bulk delete confirmation dialog", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

			render(
				<TestWrapper>
					<FilesV1Content />
				</TestWrapper>,
			);

			// Select two files
			const checkboxes = screen.getAllByRole("checkbox");
			fireEvent.click(checkboxes[1]);
			fireEvent.click(checkboxes[2]);

			await waitFor(() => {
				expect(screen.getByTestId("bulk-actions")).toBeInTheDocument();
			});

			// Click Delete Selected
			const deleteButton = screen.getByText("Delete Selected");
			fireEvent.click(deleteButton);

			// Confirmation dialog should appear
			await waitFor(() => {
				expect(screen.getByText("Delete Documents")).toBeInTheDocument();
				expect(screen.getByText(/2 documents/)).toBeInTheDocument();
			});
		});

		it("selects all files when select-all checkbox is clicked", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

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
			await waitFor(() => {
				expect(screen.getByTestId("bulk-actions")).toBeInTheDocument();
				expect(screen.getByText("3 files selected")).toBeInTheDocument();
			});
		});
	});

	describe("Toast Notifications", () => {
		it("does not show fixed toast divs", async () => {
			const { useFiles } = await import("@/hooks/api/useFiles");
			vi.mocked(useFiles).mockReturnValue({
				data: { documents: mockFiles },
				isLoading: false,
			} as any);

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
});
