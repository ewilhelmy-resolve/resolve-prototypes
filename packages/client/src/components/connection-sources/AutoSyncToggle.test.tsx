/**
 * AutoSyncToggle.test.tsx - Unit tests for auto-sync toggle component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ritaToast } from "@/components/ui/rita-toast";
import { AutoSyncToggle } from "./AutoSyncToggle";

// Mock hooks
const mockUpdateMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

const mockActiveModelQuery = {
	data: null as {
		active: boolean;
		metadata?: { training_state?: string };
	} | null,
};

vi.mock("@/hooks/useDataSources", () => ({
	useUpdateDataSource: vi.fn(() => mockUpdateMutation),
}));

vi.mock("@/hooks/useActiveModel", () => ({
	useActiveModel: vi.fn(() => mockActiveModelQuery),
}));

vi.mock("@/components/ui/rita-toast", () => ({
	ritaToast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Default props
const defaultProps = {
	connectionId: "conn-123",
	currentValue: true,
};

describe("AutoSyncToggle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockActiveModelQuery.data = null;
		mockUpdateMutation.mutateAsync = vi.fn().mockResolvedValue({});
		mockUpdateMutation.isPending = false;
	});

	describe("Visibility", () => {
		it("should not render when no active model exists", () => {
			mockActiveModelQuery.data = null;
			render(<AutoSyncToggle {...defaultProps} />);

			expect(screen.queryByRole("switch")).not.toBeInTheDocument();
		});

		it("should render when active model exists even if not active", () => {
			mockActiveModelQuery.data = { active: false };
			render(<AutoSyncToggle {...defaultProps} />);

			expect(screen.getByRole("switch")).toBeInTheDocument();
		});

		it("should render when active model is active", () => {
			mockActiveModelQuery.data = { active: true };
			render(<AutoSyncToggle {...defaultProps} />);

			expect(screen.getByRole("switch")).toBeInTheDocument();
			expect(screen.getByText("config.autoSync.label")).toBeInTheDocument();
			expect(
				screen.getByText("config.autoSync.description"),
			).toBeInTheDocument();
		});
	});

	describe("Toggle Behavior", () => {
		beforeEach(() => {
			mockActiveModelQuery.data = { active: true };
		});

		it("should reflect currentValue prop as checked state", () => {
			render(<AutoSyncToggle {...defaultProps} currentValue={true} />);
			expect(screen.getByRole("switch")).toBeChecked();
		});

		it("should reflect currentValue=false as unchecked state", () => {
			render(<AutoSyncToggle {...defaultProps} currentValue={false} />);
			expect(screen.getByRole("switch")).not.toBeChecked();
		});

		it("should call update mutation with auto_sync=false when toggling off", async () => {
			render(<AutoSyncToggle {...defaultProps} currentValue={true} />);

			fireEvent.click(screen.getByRole("switch"));

			await waitFor(() => {
				expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
					id: "conn-123",
					data: { auto_sync: false },
				});
			});
		});

		it("should call update mutation with auto_sync=true when toggling on", async () => {
			render(<AutoSyncToggle {...defaultProps} currentValue={false} />);

			fireEvent.click(screen.getByRole("switch"));

			await waitFor(() => {
				expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
					id: "conn-123",
					data: { auto_sync: true },
				});
			});
		});

		it("should update UI optimistically before mutation resolves", async () => {
			// Use a promise we control to delay mutation resolution
			let resolveMutation: (() => void) | undefined;
			mockUpdateMutation.mutateAsync = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolveMutation = resolve;
					}),
			);

			render(<AutoSyncToggle {...defaultProps} currentValue={true} />);
			const toggle = screen.getByRole("switch");

			expect(toggle).toBeChecked();

			fireEvent.click(toggle);

			// UI should update immediately (optimistic)
			expect(toggle).not.toBeChecked();

			// Resolve the mutation
			resolveMutation?.();
			await waitFor(() => {
				expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled();
			});
		});

		it("should rollback on error and show toast", async () => {
			mockUpdateMutation.mutateAsync = vi
				.fn()
				.mockRejectedValue(new Error("Network error"));

			render(<AutoSyncToggle {...defaultProps} currentValue={true} />);
			const toggle = screen.getByRole("switch");

			fireEvent.click(toggle);

			// Optimistic update
			expect(toggle).not.toBeChecked();

			// Wait for error handling
			await waitFor(() => {
				// Should rollback to original value
				expect(toggle).toBeChecked();
			});

			expect(ritaToast.error).toHaveBeenCalledWith({
				title: "config.autoSync.error",
				description: "Network error",
			});
		});
	});

	describe("Disabled State", () => {
		beforeEach(() => {
			mockActiveModelQuery.data = { active: true };
		});

		it("should be disabled when disabled prop is true", () => {
			render(<AutoSyncToggle {...defaultProps} disabled={true} />);

			expect(screen.getByRole("switch")).toBeDisabled();
		});

		it("should be disabled when mutation is pending", () => {
			mockUpdateMutation.isPending = true;
			render(<AutoSyncToggle {...defaultProps} />);

			expect(screen.getByRole("switch")).toBeDisabled();
		});

		it("should not be disabled by default", () => {
			render(<AutoSyncToggle {...defaultProps} />);

			expect(screen.getByRole("switch")).not.toBeDisabled();
		});
	});
});
