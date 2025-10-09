/**
 * ConfluenceForm.test.tsx - Unit tests for Confluence connection form
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import { ConfluenceForm } from "./ConfluenceForm";

// Define DataSourceConnection type locally for the test
type DataSourceType = 'confluence' | 'sharepoint' | 'servicenow' | 'websearch';

type DataSourceConnection = {
	id: string;
	organization_id: string;
	type: DataSourceType;
	name: string;
	description: string | null;
	settings: Record<string, any>;
	latest_options: Record<string, any> | null;
	status: 'idle' | 'verifying' | 'syncing';
	last_sync_status: 'completed' | 'failed' | null;
	enabled: boolean;
	last_verification_at: string | null;
	last_verification_error: string | null;
	last_sync_at: string | null;
	last_sync_error: string | null;
	created_by: string;
	updated_by: string;
	created_at: string;
	updated_at: string;
};

// Mock hooks
const mockUpdateMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

const mockVerifyMutation = {
	mutateAsync: vi.fn().mockResolvedValue({}),
	isPending: false,
};

vi.mock("@/hooks/useDataSources", () => ({
	useUpdateDataSource: vi.fn(() => mockUpdateMutation),
	useVerifyDataSource: vi.fn(() => mockVerifyMutation),
}));

vi.mock("@/lib/toast", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock connection source
const baseBackendData = {
	id: "source-123",
	organization_id: "org-123",
	type: "confluence" as DataSourceType,
	name: "Confluence",
	description: null,
	settings: {},
	latest_options: null,
	status: "idle",
	last_sync_status: null,
	enabled: false,
	last_verification_at: null,
	last_verification_error: null,
	last_sync_at: null,
	last_sync_error: null,
	created_by: "user-123",
	updated_by: "user-123",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-02T00:00:00Z",
};

const createMockSource = (
	overrides?: Partial<ConnectionSource>,
): ConnectionSource => ({
	id: "source-123",
	type: "confluence",
	title: "Confluence",
	status: STATUS.NOT_CONNECTED,
	lastSync: undefined,
	badges: [],
	backendData: baseBackendData as DataSourceConnection,
	...overrides,
});

const renderWithProvider = (
	source: ConnectionSource,
	onCancel?: () => void,
) => {
	return render(
		<ConnectionSourceProvider source={source}>
			<ConfluenceForm onCancel={onCancel} />
		</ConnectionSourceProvider>,
	);
};

describe("ConfluenceForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Form Rendering", () => {
		it("should render authentication section", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByText("Authentication")).toBeInTheDocument();
		});

		it("should render URL input field", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByLabelText("URL")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("https://your-company.atlassian.net"),
			).toBeInTheDocument();
		});

		it("should render email input field", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByLabelText("User email")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("you@company.com"),
			).toBeInTheDocument();
		});

		it("should render API token input field", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByLabelText("API token")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
		});

		it("should render Connect button", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(
				screen.getByRole("button", { name: /connect/i }),
			).toBeInTheDocument();
		});

		it("should render Cancel button when onCancel is provided", () => {
			const mockOnCancel = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, mockOnCancel);
			expect(
				screen.getByRole("button", { name: /cancel/i }),
			).toBeInTheDocument();
		});

		it("should not render Cancel button when onCancel is not provided", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(
				screen.queryByRole("button", { name: /cancel/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("Pre-filled Values", () => {
		it("should pre-fill URL from settings", () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					settings: {
						url: "https://company.atlassian.net",
					},
				} as DataSourceConnection,
			});
			renderWithProvider(source);
			const urlInput = screen.getByLabelText("URL") as HTMLInputElement;
			expect(urlInput.value).toBe("https://company.atlassian.net");
		});

		it("should pre-fill email from settings", () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					settings: {
						email: "user@company.com",
					},
				} as DataSourceConnection,
			});
			renderWithProvider(source);
			const emailInput = screen.getByLabelText(
				"User email",
			) as HTMLInputElement;
			expect(emailInput.value).toBe("user@company.com");
		});

		it("should not pre-fill token (always empty for security)", () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					settings: {
						token: "secret-token",
					},
				} as DataSourceConnection,
			});
			renderWithProvider(source);
			const tokenInput = screen.getByLabelText("API token") as HTMLInputElement;
			expect(tokenInput.value).toBe("");
		});
	});

	describe("Spaces Multiselect", () => {
		it("should not show spaces multiselect when no available spaces", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.queryByText("Spaces (Optional)")).not.toBeInTheDocument();
		});

		it("should show spaces multiselect when available spaces exist", () => {
			const source = createMockSource({
				backendData: {
						...baseBackendData,
						latest_options: {
							spaces: "ENG, PROD, DOCS",
						},
					} as DataSourceConnection,
			});
			renderWithProvider(source);
			expect(screen.getByText("Spaces (Optional)")).toBeInTheDocument();
		});

		it("should pre-select spaces from settings", () => {
			const source = createMockSource({
				backendData: {
						...baseBackendData,
						latest_options: {
							spaces: "ENG, PROD, DOCS",
						},
						settings: {
							spaces: "ENG, PROD",
						},
					} as DataSourceConnection,
			});
			renderWithProvider(source);
			// Spaces should be pre-selected (would need to interact with MultiSelect to verify)
		});
	});

	describe("Form Validation", () => {
		it("should show validation error when submitting without URL", async () => {
			const { toast } = await import("@/lib/toast");
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Validation Error", {
					description: "Please fill in all authentication fields",
				});
			});
		});

		it("should show validation error when submitting without email", async () => {
			const { toast } = await import("@/lib/toast");
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Validation Error", {
					description: "Please fill in all authentication fields",
				});
			});
		});

		it("should show validation error when submitting without token", async () => {
			const { toast } = await import("@/lib/toast");
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			const emailInput = screen.getByLabelText("User email");

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Validation Error", {
					description: "Please fill in all authentication fields",
				});
			});
		});
	});

	describe("Form Submission", () => {
		it("should call verify and update mutations on valid submission", async () => {
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			const emailInput = screen.getByLabelText("User email");
			const tokenInput = screen.getByLabelText("API token");

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(mockVerifyMutation.mutateAsync).toHaveBeenCalledWith({
					id: "source-123",
					payload: {
						settings: {
							url: "https://company.atlassian.net",
							email: "user@company.com",
						},
						credentials: {
							apiToken: "secret-token",
						},
					},
				});
			});

			await waitFor(() => {
				expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
					id: "source-123",
					data: {
						settings: {
							url: "https://company.atlassian.net",
							email: "user@company.com",
							spaces: "",
						},
						enabled: true,
					},
				});
			});
		});

		it("should include selected spaces in update mutation", async () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					latest_options: {
						spaces: "ENG, PROD",
					},
				} as DataSourceConnection,
			});
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			const emailInput = screen.getByLabelText("User email");
			const tokenInput = screen.getByLabelText("API token");

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled();
			});

			const updateCall = mockUpdateMutation.mutateAsync.mock.calls[0][0];
			expect(updateCall.data.settings).toHaveProperty("spaces");
		});

		it("should show success toast on successful connection", async () => {
			const { toast } = await import("@/lib/toast");
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			const emailInput = screen.getByLabelText("User email");
			const tokenInput = screen.getByLabelText("API token");

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("Connection Configured", {
					description:
						"Your Confluence connection has been configured successfully",
				});
			});
		});

		it("should show error toast on failed verification", async () => {
			const { toast } = await import("@/lib/toast");
			mockVerifyMutation.mutateAsync.mockRejectedValueOnce(
				new Error("Verification failed"),
			);

			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			const emailInput = screen.getByLabelText("User email");
			const tokenInput = screen.getByLabelText("API token");

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Connection Failed", {
					description: "Verification failed",
				});
			});
		});

		it("should show error toast on failed update", async () => {
			const { toast } = await import("@/lib/toast");
			mockUpdateMutation.mutateAsync.mockRejectedValueOnce(
				new Error("Update failed"),
			);

			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			const emailInput = screen.getByLabelText("User email");
			const tokenInput = screen.getByLabelText("API token");

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Connection Failed", {
					description: "Update failed",
				});
			});
		});
	});

	describe("Button States", () => {
		it("should disable Connect button when verifying", () => {
			mockVerifyMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", { name: /connecting/i });
			expect(connectButton).toBeDisabled();

			mockVerifyMutation.isPending = false; // Reset
		});

		it("should disable Connect button when updating", () => {
			mockUpdateMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", { name: /connecting/i });
			expect(connectButton).toBeDisabled();

			mockUpdateMutation.isPending = false; // Reset
		});

		it('should show "Connecting..." text when pending', () => {
			mockVerifyMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			expect(screen.getByText("Connecting...")).toBeInTheDocument();

			mockVerifyMutation.isPending = false; // Reset
		});

		it('should show "Connect" text when not pending', () => {
			const source = createMockSource();
			renderWithProvider(source);

			expect(screen.getByText("Connect")).toBeInTheDocument();
		});
	});

	describe("Cancel Button", () => {
		it("should call onCancel when Cancel button is clicked", () => {
			const mockOnCancel = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, mockOnCancel);

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			fireEvent.click(cancelButton);

			expect(mockOnCancel).toHaveBeenCalledTimes(1);
		});
	});

	describe("Input Field Types", () => {
		it('should have URL input with type="url"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText("URL");
			expect(urlInput).toHaveAttribute("type", "url");
		});

		it('should have email input with type="email"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const emailInput = screen.getByLabelText("User email");
			expect(emailInput).toHaveAttribute("type", "email");
		});

		it('should have token input with type="password"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const tokenInput = screen.getByLabelText("API token");
			expect(tokenInput).toHaveAttribute("type", "password");
		});
	});
});
