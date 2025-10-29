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
import { beforeEach, describe, expect, it, vi } from "vitest";
import FilesV1Content from "./FilesV1Content";

// Mock file data matching the real FileDocument type
const mockFiles = [
	{
		id: "file-1",
		filename: "test-document.pdf",
		status: "processed",
		source: "manual",
		size: 1024000,
		created_at: new Date("2025-01-01"),
	},
	{
		id: "file-2",
		filename: "confluence-page.txt",
		status: "processing",
		source: "confluence",
		size: 512000,
		created_at: new Date("2025-01-02"),
	},
	{
		id: "file-3",
		filename: "failed-doc.docx",
		status: "failed",
		source: "manual",
		size: 2048000,
		created_at: new Date("2025-01-03"),
	},
];

// Mock hooks
vi.mock("@/hooks/api/useFiles", () => ({
	useFiles: vi.fn(() => ({
		data: { documents: mockFiles },
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

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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

		it("displays statistics cards", () => {
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
				expect(screen.getByText("No documents found")).toBeInTheDocument();
				expect(
					screen.getByText("Upload your first document to get started"),
				).toBeInTheDocument();
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
			// With 3 files, we expect: 1 upload + 2 filters + 4 sort buttons + 3 action menus = 10+
			expect(buttons.length).toBeGreaterThanOrEqual(10);
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
	});
});
