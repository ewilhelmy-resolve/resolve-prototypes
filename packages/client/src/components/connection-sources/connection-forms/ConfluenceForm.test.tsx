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

vi.mock("@/components/ui/rita-toast", () => ({
	ritaToast: {
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
	onSuccess?: () => void,
	onFailure?: () => void,
) => {
	return render(
		<ConnectionSourceProvider source={source}>
			<ConfluenceForm onCancel={onCancel} onSuccess={onSuccess} onFailure={onFailure} />
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
			expect(screen.getByText("form.sections.authentication")).toBeInTheDocument();
		});

		it("should render URL input field with required indicator", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByLabelText(/form.labels.url/i)).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("form.placeholders.confluenceUrl"),
			).toBeInTheDocument();
		});

		it("should render email input field with required indicator", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByLabelText(/form.labels.userEmail/i)).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("form.placeholders.email"),
			).toBeInTheDocument();
		});

		it("should render API token input field with required indicator", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByLabelText(/form.labels.apiToken/i)).toBeInTheDocument();
			expect(screen.getByPlaceholderText("form.placeholders.apiToken")).toBeInTheDocument();
		});

		it("should render Connect button", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(
				screen.getByRole("button", { name: /form.buttons.connect/i }),
			).toBeInTheDocument();
		});

		it("should render Cancel button when onCancel is provided", () => {
			const mockOnCancel = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, mockOnCancel);
			expect(
				screen.getByRole("button", { name: /form.buttons.cancel/i }),
			).toBeInTheDocument();
		});

		it("should not render Cancel button when onCancel is not provided", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(
				screen.queryByRole("button", { name: /form.buttons.cancel/i }),
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
			const urlInput = screen.getByLabelText(/form.labels.url/i) as HTMLInputElement;
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
				/form.labels.userEmail/i,
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
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i) as HTMLInputElement;
			expect(tokenInput.value).toBe("");
		});
	});

	// Note: Spaces Multiselect tests removed as this feature is not yet implemented
	// TODO: Re-add these tests when the Spaces Multiselect feature is implemented

	describe("Form Validation", () => {
		it("should enable Connect button by default (even when form is empty)", () => {
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			expect(connectButton).not.toBeDisabled();
		});

		it("should show validation error toast when clicking Connect with empty form", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith({
				title: "error.validationError",
					description: "descriptions.checkFormFields",
				});
			});
		});

		it("should show validation error for invalid URL format after clicking Connect", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, { target: { value: "invalid-url" } });
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith({
				title: "error.validationError",
					description: "descriptions.checkFormFields",
				});
			});

			// Field error should appear (translation key)
			await waitFor(() => {
				expect(
					screen.getByText("form.validation.invalidUrl"),
				).toBeInTheDocument();
			});
		});

		it("should show validation error for invalid email format after clicking Connect", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "invalid-email" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith({
				title: "error.validationError",
					description: "descriptions.checkFormFields",
				});
			});

			// Field error should appear (translation key)
			await waitFor(() => {
				expect(
					screen.getByText("form.validation.invalidEmail"),
				).toBeInTheDocument();
			});
		});

		it("should not show field errors until Connect button is clicked", () => {
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);

			// Type invalid values
			fireEvent.change(urlInput, { target: { value: "invalid-url" } });
			fireEvent.change(emailInput, { target: { value: "invalid-email" } });
			fireEvent.blur(urlInput);
			fireEvent.blur(emailInput);

			// Errors should NOT appear yet (mode is "onSubmit")
			expect(
				screen.queryByText("form.validation.invalidUrl"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("form.validation.invalidEmail"),
			).not.toBeInTheDocument();
		});

		it("should proceed with connection when all fields are valid", async () => {
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			// Should call verify mutation (not show validation error)
			await waitFor(() => {
				expect(mockVerifyMutation.mutateAsync).toHaveBeenCalled();
			});
		});
	});

	describe("Form Submission", () => {
		it("should call verify and update mutations on valid submission", async () => {
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
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
						},
						enabled: true,
					},
				});
			});
		});

		// Note: Spaces-related test removed as this feature is not yet implemented
		// TODO: Re-add this test when the Spaces Multiselect feature is implemented

		it("should show success toast on successful connection", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.success).toHaveBeenCalledWith({
				title: "success.connectionConfigured",
					description: "descriptions.confluenceConfigured",
				});
			});
		});

		it("should show error toast on failed verification", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			mockVerifyMutation.mutateAsync.mockRejectedValueOnce(
				new Error("Verification failed"),
			);

			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith({
				title: "error.connectionFailed",
					description: "Verification failed",
				});
			});
		});

		it("should show error toast on failed update", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			mockUpdateMutation.mutateAsync.mockRejectedValueOnce(
				new Error("Update failed"),
			);

			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalledWith({
				title: "error.connectionFailed",
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

			const connectButton = screen.getByRole("button", { name: /form.buttons.connecting/i });
			expect(connectButton).toBeDisabled();

			mockVerifyMutation.isPending = false; // Reset
		});

		it("should disable Connect button when updating", () => {
			mockUpdateMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", { name: /form.buttons.connecting/i });
			expect(connectButton).toBeDisabled();

			mockUpdateMutation.isPending = false; // Reset
		});

		it('should show "Connecting..." text when pending', () => {
			mockVerifyMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			expect(screen.getByText("form.buttons.connecting")).toBeInTheDocument();

			mockVerifyMutation.isPending = false; // Reset
		});

		it('should show "Connect" text when not pending', () => {
			const source = createMockSource();
			renderWithProvider(source);

			expect(screen.getByText("form.buttons.connect")).toBeInTheDocument();
		});
	});

	describe("StatusAlert Display", () => {
		it("should show status alert when verification is pending", () => {
			mockVerifyMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			expect(
				screen.getByText("form.alerts.connectionMayTakeTime"),
			).toBeInTheDocument();
			expect(
				screen.getByText("form.alerts.canLeavePage"),
			).toBeInTheDocument();

			mockVerifyMutation.isPending = false; // Reset
		});

		it("should not show status alert when verification is not pending", () => {
			mockVerifyMutation.isPending = false;
			const source = createMockSource();
			renderWithProvider(source);

			expect(
				screen.queryByText("form.alerts.connectionMayTakeTime"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("form.alerts.canLeavePage"),
			).not.toBeInTheDocument();
		});

		it("should not show status alert when only update is pending", () => {
			mockVerifyMutation.isPending = false;
			mockUpdateMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			expect(
				screen.queryByText("form.alerts.connectionMayTakeTime"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("form.alerts.canLeavePage"),
			).not.toBeInTheDocument();

			mockUpdateMutation.isPending = false; // Reset
		});
	});

	describe("Cancel Button", () => {
		it("should call onCancel when Cancel button is clicked", () => {
			const mockOnCancel = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, mockOnCancel);

			const cancelButton = screen.getByRole("button", { name: /form.buttons.cancel/i });
			fireEvent.click(cancelButton);

			expect(mockOnCancel).toHaveBeenCalledTimes(1);
		});
	});

	describe("Success Callback", () => {
		it("should call onSuccess callback after successful connection", async () => {
			const mockOnSuccess = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, undefined, mockOnSuccess);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(mockOnSuccess).toHaveBeenCalledTimes(1);
			});
		});

		it("should not call onSuccess callback when connection fails", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			mockVerifyMutation.mutateAsync.mockRejectedValueOnce(
				new Error("Verification failed"),
			);

			const mockOnSuccess = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, undefined, mockOnSuccess);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalled();
			});

			// onSuccess should NOT be called on failure
			expect(mockOnSuccess).not.toHaveBeenCalled();
		});

		it("should call onFailure callback when connection fails", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			mockVerifyMutation.mutateAsync.mockRejectedValueOnce(
				new Error("Verification failed"),
			);

			const mockOnFailure = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, undefined, undefined, mockOnFailure);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);

			fireEvent.change(urlInput, {
				target: { value: "https://company.atlassian.net" },
			});
			fireEvent.change(emailInput, { target: { value: "user@company.com" } });
			fireEvent.change(tokenInput, { target: { value: "secret-token" } });

			const connectButton = screen.getByRole("button", { name: /form.buttons.connect/i });
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalled();
			});

			// onFailure SHOULD be called on failure
			expect(mockOnFailure).toHaveBeenCalledTimes(1);
		});
	});

	describe("Input Field Types", () => {
		it('should have URL input with type="url"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const urlInput = screen.getByLabelText(/form.labels.url/i);
			expect(urlInput).toHaveAttribute("type", "url");
		});

		it('should have email input with type="email"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const emailInput = screen.getByLabelText(/form.labels.userEmail/i);
			expect(emailInput).toHaveAttribute("type", "email");
		});

		it('should have token input with type="password"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const tokenInput = screen.getByLabelText(/form.labels.apiToken/i);
			expect(tokenInput).toHaveAttribute("type", "password");
		});
	});
});
