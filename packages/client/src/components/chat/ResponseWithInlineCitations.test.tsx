/**
 * ResponseWithInlineCitations.test.tsx - Unit tests for ResponseWithInlineCitations
 *
 * Tests the component that:
 * - Parses citation markers in text ([1], [2], etc.)
 * - Renders interactive inline citations
 * - Fetches document metadata for blob_id sources
 * - Shows full document modal
 * - Handles missing sources gracefully
 * - Falls back to regular Response when no citations
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CitationSource } from "@/components/citations/Citations";
import { ResponseWithInlineCitations } from "./ResponseWithInlineCitations";

// Mock dependencies
vi.mock("@/components/ai-elements/response", () => ({
	Response: ({ children, className }: any) => (
		<div data-testid="regular-response" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/components/ai-elements/inline-citation", () => ({
	InlineCitation: ({ children }: any) => (
		<span data-testid="inline-citation">{children}</span>
	),
	InlineCitationCard: ({ children }: any) => (
		<div data-testid="citation-card">{children}</div>
	),
	InlineCitationCardTrigger: ({ sources }: any) => (
		<button data-testid="citation-trigger" data-sources={sources.join(",")}>
			Trigger
		</button>
	),
	InlineCitationCardBody: ({ children }: any) => (
		<div data-testid="citation-card-body">{children}</div>
	),
}));

vi.mock("streamdown", () => ({
	Streamdown: ({ children }: any) => (
		<div data-testid="streamdown">{children}</div>
	),
}));

vi.mock("@/hooks/api/useDocumentMetadata", () => ({
	useDocumentMetadata: vi.fn(() => ({
		// Always return no error by default for all citations
		// Individual tests can override this behavior as needed
		data: undefined,
		isLoading: false,
		isError: false,
	})),
	documentMetadataKeys: {
		detail: (id: string) => ["documentMetadata", id],
	},
}));

vi.mock("@/services/api", () => ({
	fileApi: {
		getDocumentMetadata: vi.fn(),
	},
}));

// Test wrapper with QueryClient
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

// Mock data
const mockSources: CitationSource[] = [
	{
		url: "https://example.com/doc1",
		title: "First Document",
		snippet: "This is an excerpt from the first document.",
	},
	{
		url: "https://example.com/doc2",
		title: "Second Document",
	},
	{
		blob_id: "blob-123",
		title: "Third Document",
		content: "Full content of third document",
	},
];

describe("ResponseWithInlineCitations", () => {
	beforeEach(async () => {
		vi.clearAllMocks();

		// Reset useDocumentMetadata mock to default behavior
		const { useDocumentMetadata } = await import(
			"@/hooks/api/useDocumentMetadata"
		);
		vi.mocked(useDocumentMetadata).mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		} as any);
	});

	describe("Fallback to Regular Response", () => {
		it("renders regular Response when no sources provided", () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations>
						Plain text without citations
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			expect(screen.getByTestId("regular-response")).toBeInTheDocument();
			expect(
				screen.getByText("Plain text without citations"),
			).toBeInTheDocument();
		});

		it("renders regular Response when sources array is empty", () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={[]}>
						Plain text without citations
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			expect(screen.getByTestId("regular-response")).toBeInTheDocument();
		});

		it("renders regular Response when no citation markers present", () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						Plain text without any citation markers
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			expect(screen.getByTestId("regular-response")).toBeInTheDocument();
		});

		it("applies custom className to regular Response", () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations className="custom-class" sources={[]}>
						Plain text
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			const response = screen.getByTestId("regular-response");
			expect(response.className).toContain("custom-class");
		});
	});

	describe("Citation Marker Parsing", () => {
		it("parses and renders citation markers inline", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						According to research [1], this is confirmed [2].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const citations = screen.getAllByTestId("inline-citation");
				expect(citations.length).toBe(2);
			});
		});

		it("handles consecutive citation markers", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						Multiple sources [1][2][3] support this.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const citations = screen.getAllByTestId("inline-citation");
				expect(citations.length).toBe(3);
			});
		});

		it("preserves text segments order", async () => {
			const { container } = render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						Start [1] middle [2] end
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const text = container.textContent;
				expect(text).toContain("Start");
				expect(text).toContain("middle");
				expect(text).toContain("end");
			});
		});

		it("handles citation markers with missing sources", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={[mockSources[0]]}>
						Valid citation [1] and invalid [5].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				// Should only render 1 citation (valid one)
				const citations = screen.getAllByTestId("inline-citation");
				expect(citations.length).toBe(1);

				// Invalid citation marker [5] should be shown as text
				expect(screen.getByText("[5]")).toBeInTheDocument();
			});
		});
	});

	describe("Inline Citation Content", () => {
		it("displays source title in citation card", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						Research shows [1] this fact.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("First Document")).toBeInTheDocument();
			});
		});

		it("displays snippet when available", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						According to [1], this is true.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(
					screen.getByText("This is an excerpt from the first document."),
				).toBeInTheDocument();
			});
		});

		it("displays URL when snippet not available", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						As stated in [2].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(
					screen.getByText("https://example.com/doc2"),
				).toBeInTheDocument();
			});
		});

		it("renders view source link with correct href", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						Reference [1] explains this.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const link = screen.getByText("View source").closest("a");
				expect(link).toHaveAttribute("href", "https://example.com/doc1");
				expect(link).toHaveAttribute("target", "_blank");
				expect(link).toHaveAttribute("rel", "noopener noreferrer");
			});
		});

		it("logs audit event when view source clicked", async () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			render(
				<TestWrapper>
					<ResponseWithInlineCitations
						sources={mockSources}
						messageId="msg-123"
					>
						Reference [1] explains this.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const link = screen.getByText("View source");
				fireEvent.click(link);
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				"Inline citation clicked:",
				expect.objectContaining({
					messageId: "msg-123",
					sourceUrl: "https://example.com/doc1",
					sourceTitle: "First Document",
					citationIndex: 0,
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("Blob ID Support", () => {
		it("displays full document button for blob_id sources", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						Document [3] contains details.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText(/View full document/i)).toBeInTheDocument();
			});
		});

		it("does not show view source link for blob_id only sources", async () => {
			const blobOnlySource: CitationSource[] = [
				{
					blob_id: "blob-only",
					title: "Blob Only Document",
				},
			];

			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={blobOnlySource}>
						Reference [1] here.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.queryByText("View source")).not.toBeInTheDocument();
				expect(screen.getByText("Full document available")).toBeInTheDocument();
			});
		});

		it("fetches document metadata for blob_id without title", async () => {
			const { useDocumentMetadata } = await import(
				"@/hooks/api/useDocumentMetadata"
			);

			vi.mocked(useDocumentMetadata).mockReturnValue({
				data: {
					filename: "Fetched Document Title",
					metadata: { content: "Document content" },
				},
				isLoading: false,
				isError: false,
			} as any);

			const blobWithoutTitle: CitationSource[] = [
				{
					blob_id: "blob-no-title",
				},
			];

			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={blobWithoutTitle}>
						See [1] for more.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("Fetched Document Title")).toBeInTheDocument();
			});
		});

		it("shows loading state while fetching metadata", async () => {
			const { useDocumentMetadata } = await import(
				"@/hooks/api/useDocumentMetadata"
			);

			vi.mocked(useDocumentMetadata).mockReturnValue({
				data: undefined,
				isLoading: true,
				isError: false,
			} as any);

			const blobWithoutTitle: CitationSource[] = [
				{
					blob_id: "blob-loading",
				},
			];

			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={blobWithoutTitle}>
						See [1] for more.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("Loading...")).toBeInTheDocument();
			});
		});

		it("hides citation when metadata fetch fails", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const { useDocumentMetadata } = await import(
				"@/hooks/api/useDocumentMetadata"
			);

			vi.mocked(useDocumentMetadata).mockReturnValue({
				data: undefined,
				isLoading: false,
				isError: true,
			} as any);

			const blobWithoutTitle: CitationSource[] = [
				{
					blob_id: "blob-error",
				},
			];

			render(
				<TestWrapper>
					<ResponseWithInlineCitations
						sources={blobWithoutTitle}
						messageId="msg-error"
					>
						See [1] for more.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(
					"Inline citation source not found:",
					expect.objectContaining({
						blob_id: "blob-error",
						messageId: "msg-error",
					}),
				);
			});

			consoleSpy.mockRestore();
		});
	});

	describe("Full Document Modal", () => {
		it("opens modal when view full document clicked", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						Document [3] has content.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const button = screen.getByText(/View full document/i);
				fireEvent.click(button);
			});

			await waitFor(() => {
				expect(screen.getByText("Full document content")).toBeInTheDocument();
			});
		});

		it("fetches and displays document content in modal", async () => {
			const { fileApi } = await import("@/services/api");

			vi.mocked(fileApi.getDocumentMetadata).mockResolvedValue({
				filename: "Test Document",
				metadata: {
					content: "# Document Title\n\nDocument content here.",
				},
			} as any);

			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						See document [3].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const button = screen.getByText(/View full document/i);
				fireEvent.click(button);
			});

			await waitFor(() => {
				expect(screen.getByText("Test Document")).toBeInTheDocument();
				expect(screen.getByTestId("streamdown")).toBeInTheDocument();
			});
		});

		it("shows loading spinner while fetching document", async () => {
			const { fileApi } = await import("@/services/api");

			// Simulate slow API call
			vi.mocked(fileApi.getDocumentMetadata).mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 1000)),
			);

			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						See document [3].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const button = screen.getByText(/View full document/i);
				fireEvent.click(button);
			});

			// Loading spinner should appear
			expect(screen.getByText("Full document content")).toBeInTheDocument();
		});

		it("handles document fetch errors gracefully", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { fileApi } = await import("@/services/api");

			vi.mocked(fileApi.getDocumentMetadata).mockRejectedValue(
				new Error("Network error"),
			);

			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						See document [3].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const button = screen.getByText(/View full document/i);
				fireEvent.click(button);
			});

			await waitFor(() => {
				expect(
					screen.getByText("Error loading document. Please try again."),
				).toBeInTheDocument();
			});

			consoleSpy.mockRestore();
		});

		it("logs audit event when full document requested", async () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const { fileApi } = await import("@/services/api");

			vi.mocked(fileApi.getDocumentMetadata).mockResolvedValue({
				filename: "Test Document",
				metadata: { content: "Content" },
			} as any);

			render(
				<TestWrapper>
					<ResponseWithInlineCitations
						sources={mockSources}
						messageId="msg-789"
					>
						See document [3].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const button = screen.getByText(/View full document/i);
				fireEvent.click(button);
			});

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(
					"Full document requested:",
					expect.objectContaining({
						messageId: "msg-789",
						sourceTitle: "Third Document",
						blobId: "blob-123",
					}),
				);
			});

			consoleSpy.mockRestore();
		});
	});

	describe("Edge Cases", () => {
		it("handles text with only citation markers", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						[1][2][3]
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const citations = screen.getAllByTestId("inline-citation");
				expect(citations.length).toBe(3);
			});
		});

		it("handles citation markers at start and end", async () => {
			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mockSources}>
						[1] text in middle [2]
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const citations = screen.getAllByTestId("inline-citation");
				expect(citations.length).toBe(2);
			});
		});

		it("handles sources with both URL and blob_id", async () => {
			const mixedSource: CitationSource[] = [
				{
					url: "https://example.com/mixed",
					blob_id: "blob-mixed",
					title: "Mixed Source",
					snippet: "Has both URL and blob_id",
				},
			];

			render(
				<TestWrapper>
					<ResponseWithInlineCitations sources={mixedSource}>
						Reference [1].
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				// Should show both view source link and full document button
				expect(screen.getByText("View source")).toBeInTheDocument();
				expect(screen.getByText(/View full document/i)).toBeInTheDocument();
			});
		});

		it("applies custom className to citation container", async () => {
			const { container } = render(
				<TestWrapper>
					<ResponseWithInlineCitations
						sources={mockSources}
						className="custom-citations"
					>
						Text [1] here.
					</ResponseWithInlineCitations>
				</TestWrapper>,
			);

			await waitFor(() => {
				const proseDiv = container.querySelector(".prose");
				expect(proseDiv?.className).toContain("custom-citations");
			});
		});
	});
});
