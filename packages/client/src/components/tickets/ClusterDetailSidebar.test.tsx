import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test/mocks/providers";
import { ClusterDetailSidebar } from "./ClusterDetailSidebar";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

vi.mock("@/hooks/useClusters", () => ({
	useClusterKbArticles: vi.fn(() => ({
		data: undefined,
		isLoading: false,
	})),
	useGenerateKnowledge: vi.fn(() => ({
		mutateAsync: vi.fn(),
		isPending: false,
	})),
	useAddKbArticle: vi.fn(() => ({
		mutateAsync: vi.fn(),
		isPending: false,
	})),
}));

// Access the mock to change return values per test
import { useClusterKbArticles } from "@/hooks/useClusters";

const mockUseClusterKbArticles = vi.mocked(useClusterKbArticles);

const defaultProps = {
	clusterId: "cluster-1",
	clusterName: "Network Issues",
	kbArticlesCount: 0,
	kbStatus: "GAP" as const,
	onKnowledgeAdded: vi.fn(),
};

function renderSidebar(
	props: Partial<Parameters<typeof ClusterDetailSidebar>[0]> = {},
) {
	return render(
		<TestProviders>
			<ClusterDetailSidebar {...defaultProps} {...props} />
		</TestProviders>,
	);
}

describe("ClusterDetailSidebar", () => {
	it("renders section label with cluster name", () => {
		renderSidebar();
		expect(screen.getByText("Network Issues knowledge")).toBeInTheDocument();
	});

	it("shows empty state when no articles", () => {
		renderSidebar({ kbArticlesCount: 0 });
		expect(screen.getByText("knowledge.noArticles")).toBeInTheDocument();
	});

	it("shows loading spinner when fetching articles", () => {
		mockUseClusterKbArticles.mockReturnValueOnce({
			data: undefined,
			isLoading: true,
		} as any);

		renderSidebar();
		expect(screen.queryByText("knowledge.noArticles")).not.toBeInTheDocument();
	});

	it("displays API-loaded KB articles", () => {
		mockUseClusterKbArticles.mockReturnValueOnce({
			data: [
				{
					id: "1",
					filename: "guide.pdf",
					file_size: 1024,
					mime_type: "application/pdf",
					status: "processed",
					created_at: "",
					updated_at: "",
				},
				{
					id: "2",
					filename: "faq.md",
					file_size: 512,
					mime_type: "text/markdown",
					status: "processed",
					created_at: "",
					updated_at: "",
				},
			],
			isLoading: false,
		} as any);

		renderSidebar();
		expect(screen.getByText("guide.pdf")).toBeInTheDocument();
		expect(screen.getByText("faq.md")).toBeInTheDocument();
	});

	it("shows count-based fallback when API returns empty but count > 0", () => {
		renderSidebar({ kbArticlesCount: 2 });
		expect(screen.getByText("Knowledge article 1")).toBeInTheDocument();
		expect(screen.getByText("Knowledge article 2")).toBeInTheDocument();
	});

	it("shows Knowledge Gap CTA when kbStatus is GAP", () => {
		renderSidebar({ kbStatus: "GAP" });
		expect(screen.getByText("knowledgeGap.title")).toBeInTheDocument();
		expect(screen.getByText("knowledgeGap.description")).toBeInTheDocument();
	});

	it("hides Knowledge Gap CTA when kbStatus is FOUND", () => {
		renderSidebar({ kbStatus: "FOUND" });
		expect(screen.queryByText("knowledgeGap.title")).not.toBeInTheDocument();
	});

	it("renders Add knowledge button", () => {
		renderSidebar();
		expect(screen.getByText("Add knowledge")).toBeInTheDocument();
	});

	it("shows dropdown with Upload file option", async () => {
		const user = userEvent.setup();
		renderSidebar();

		await user.click(screen.getByText("Add knowledge"));
		await waitFor(() => {
			expect(screen.getByText("Upload file")).toBeInTheDocument();
		});
	});

	it("shows Generate article option when kbStatus is GAP", async () => {
		const user = userEvent.setup();
		renderSidebar({ kbStatus: "GAP" });

		await user.click(screen.getByText("Add knowledge"));
		await waitFor(() => {
			expect(screen.getByText("Generate article")).toBeInTheDocument();
		});
	});

	it("hides Generate article option when kbStatus is FOUND", async () => {
		const user = userEvent.setup();
		renderSidebar({ kbStatus: "FOUND" });

		await user.click(screen.getByText("Add knowledge"));
		await waitFor(() => {
			expect(screen.queryByText("Generate article")).not.toBeInTheDocument();
		});
	});

	it("logs to console when Upload file is clicked", async () => {
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const user = userEvent.setup();
		renderSidebar();

		await user.click(screen.getByText("Add knowledge"));
		await waitFor(() => screen.getByText("Upload file"));
		await user.click(screen.getByText("Upload file"));

		expect(consoleSpy).toHaveBeenCalledWith(
			"[ClusterDetailSidebar] Upload file clicked",
			{ clusterId: "cluster-1", clusterName: "Network Issues" },
		);
		consoleSpy.mockRestore();
	});

	it("shows Connect sources option in dropdown", async () => {
		const user = userEvent.setup();
		renderSidebar();

		await user.click(screen.getByText("Add knowledge"));
		await waitFor(() => {
			expect(screen.getByText("Connect sources")).toBeInTheDocument();
		});
	});
});
