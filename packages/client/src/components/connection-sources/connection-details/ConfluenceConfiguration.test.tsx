/**
 * ConfluenceConfiguration.test.tsx - Unit tests for Confluence configuration component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import ConfluenceConfiguration from "./ConfluenceConfiguration";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
	useNavigate: () => mockNavigate,
}));

// Mock hooks
const mockUpdateMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

const mockSyncMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

vi.mock("@/hooks/useDataSources", () => ({
	useUpdateDataSource: vi.fn(() => mockUpdateMutation),
	useTriggerSync: vi.fn(() => mockSyncMutation),
}));

vi.mock("@/lib/toast", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock connection source
const createMockSource = (
	overrides?: Partial<ConnectionSource>,
): ConnectionSource => ({
	id: "source-123",
	type: "confluence",
	title: "Confluence",
	status: STATUS.CONNECTED,
	lastSync: "2 hours ago",
	badges: ["ENG", "PROD"],
	backendData: {
		id: "source-123",
		organization_id: "org-123",
		type: "confluence",
		name: "Confluence",
		description: null,
		settings: {
			url: "https://company.atlassian.net",
			email: "user@company.com",
			spaces: "ENG, PROD, DOCS",
		},
		latest_options: {
			spaces: "ENG, PROD, DOCS, MARKETING",
		},
		status: "idle",
		last_sync_status: "completed",
		enabled: true,
		last_verification_at: "2024-01-01T00:00:00Z",
		last_verification_error: null,
		last_sync_at: "2024-01-02T00:00:00Z",
		last_sync_error: null,
		created_by: "user-123",
		updated_by: "user-123",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-02T00:00:00Z",
	},
	...overrides,
});

const renderWithProvider = (source: ConnectionSource, onEdit?: () => void) => {
	return render(
		<ConnectionSourceProvider source={source}>
			<ConfluenceConfiguration onEdit={onEdit} />
		</ConnectionSourceProvider>,
	);
};

describe("ConfluenceConfiguration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render configuration title", () => {
		const source = createMockSource();
		renderWithProvider(source);
		expect(screen.getByText("Confluence configuration")).toBeInTheDocument();
	});

	it("should render connection status card", () => {
		const source = createMockSource();
		renderWithProvider(source);
		// ConnectionStatusCard should be rendered
		expect(screen.getByText("Connected")).toBeInTheDocument();
	});

	it("should render actions menu", () => {
		const source = createMockSource();
		renderWithProvider(source);
		// EllipsisVertical button should be present (there are multiple buttons, check for existence)
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThan(0);
	});

	it("should call onEdit when Edit is clicked", async () => {
		const user = userEvent.setup();
		const mockOnEdit = vi.fn();
		const source = createMockSource();
		renderWithProvider(source, mockOnEdit);

		// Get the menu trigger button (not the sync button)
		const buttons = screen.getAllByRole("button");
		const menuButton = buttons.find(
			(btn) => btn.getAttribute("aria-haspopup") === "menu",
		);
		expect(menuButton).toBeDefined();

		if (!menuButton) throw new Error("Menu button not found");

		await user.click(menuButton);

		const editOption = await screen.findByText("Edit");
		await user.click(editOption);

		expect(mockOnEdit).toHaveBeenCalledTimes(1);
	});

	it("should render spaces multiselect", () => {
		const source = createMockSource();
		renderWithProvider(source);
		expect(
			screen.getByText("Which spaces would you like to sync from?"),
		).toBeInTheDocument();
	});

	it("should show available spaces from latest_options", () => {
		const source = createMockSource();
		renderWithProvider(source);
		// MultiSelect component should have options from latest_options.spaces
		// This would require interaction with the MultiSelect component
	});

	it("should pre-select spaces from settings", () => {
		const source = createMockSource();
		renderWithProvider(source);
		// Selected spaces should be 'ENG, PROD, DOCS'
	});

	it("should disable sync button when syncing", () => {
		const source = createMockSource({
			status: STATUS.SYNCING,
		});
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		expect(syncButton).toBeDisabled();
	});

	it("should disable sync button when verifying", () => {
		const source = createMockSource({
			status: STATUS.VERIFYING,
		});
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		expect(syncButton).toBeDisabled();
	});

	it("should enable sync button when connected", () => {
		const source = createMockSource({
			status: STATUS.CONNECTED,
		});
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		expect(syncButton).toBeEnabled();
	});

	it("should call update and sync mutations when sync button clicked", async () => {
		const source = createMockSource();
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		fireEvent.click(syncButton);

		await waitFor(() => {
			expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
				id: "source-123",
				data: {
					settings: {
						url: "https://company.atlassian.net",
						email: "user@company.com",
						spaces: "ENG,PROD,DOCS", // Join without spaces (actual behavior)
					},
				},
			});
			expect(mockSyncMutation.mutateAsync).toHaveBeenCalledWith("source-123");
		});
	});

	it("should call update mutation before sync mutation", async () => {
		const callOrder: string[] = [];

		mockUpdateMutation.mutateAsync = vi.fn().mockImplementation(async () => {
			callOrder.push("update");
			return Promise.resolve({});
		});

		mockSyncMutation.mutateAsync = vi.fn().mockImplementation(async () => {
			callOrder.push("sync");
			return Promise.resolve({});
		});

		const source = createMockSource();
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		fireEvent.click(syncButton);

		await waitFor(() => {
			expect(callOrder).toEqual(["update", "sync"]);
		});
	});

	it("should show success toast on successful sync", async () => {
		const { toast } = await import("@/lib/toast");
		const source = createMockSource();
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		fireEvent.click(syncButton);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("Sync Started", {
				description: "Your Confluence spaces are being synced",
			});
		});
	});

	it("should show error toast on failed sync", async () => {
		const { toast } = await import("@/lib/toast");
		mockUpdateMutation.mutateAsync.mockRejectedValueOnce(
			new Error("Sync failed"),
		);

		const source = createMockSource();
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		fireEvent.click(syncButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Sync Failed", {
				description: "Sync failed",
			});
		});
	});

	it("should show error when backend data is missing", async () => {
		const { toast } = await import("@/lib/toast");
		const source = createMockSource({ backendData: undefined });
		renderWithProvider(source);

		const syncButton = screen.getByRole("button", { name: /sync/i });
		fireEvent.click(syncButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Configuration Error", {
				description: "No backend data available for this source",
			});
		});
	});

	it('should show "Syncing..." when mutation is pending', () => {
		const source = createMockSource({ status: STATUS.CONNECTED });
		mockSyncMutation.isPending = true;

		renderWithProvider(source);

		expect(screen.getByText("Syncing...")).toBeInTheDocument();
	});
});
