/**
 * FreshserviceForm.test.tsx - Unit tests for Freshservice connection form
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import { FreshserviceForm } from "./FreshserviceForm";

// Define DataSourceConnection type locally for the test
type DataSourceType =
	| "confluence"
	| "sharepoint"
	| "servicenow"
	| "websearch"
	| "freshservice_itsm";

type DataSourceConnection = {
	id: string;
	organization_id: string;
	type: DataSourceType;
	name: string;
	description: string | null;
	settings: Record<string, any>;
	latest_options: Record<string, any> | null;
	status: "idle" | "verifying" | "syncing";
	last_sync_status: "completed" | "failed" | null;
	enabled: boolean;
	auto_sync: boolean;
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
	type: "freshservice_itsm" as DataSourceType,
	name: "Freshservice",
	description: null,
	settings: {},
	latest_options: null,
	status: "idle",
	last_sync_status: null,
	enabled: false,
	auto_sync: true,
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
	type: "freshservice_itsm",
	title: "Freshservice",
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
			<FreshserviceForm
				onCancel={onCancel}
				onSuccess={onSuccess}
				onFailure={onFailure}
			/>
		</ConnectionSourceProvider>,
	);
};

describe("FreshserviceForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Form Rendering", () => {
		it("should render authentication section", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(
				screen.getByText("form.sections.authentication"),
			).toBeInTheDocument();
		});

		it("should render domain input field with required indicator", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(
				screen.getByText(/form.labels.freshserviceDomain/i),
			).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("form.placeholders.freshserviceDomain"),
			).toBeInTheDocument();
		});

		it("should render API key input field with required indicator", () => {
			const source = createMockSource();
			renderWithProvider(source);
			expect(screen.getByText(/form.labels.apiKey/i)).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("form.placeholders.apiKey"),
			).toBeInTheDocument();
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
		it("should pre-fill domain from settings", () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					settings: {
						domain: "https://company.freshservice.com",
					},
				} as DataSourceConnection,
			});
			renderWithProvider(source);
			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			) as HTMLInputElement;
			expect(domainInput.value).toBe("https://company.freshservice.com");
		});

		it("should not pre-fill apiKey (always empty for security)", () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					settings: {
						domain: "https://company.freshservice.com",
						apiKey: "secret-key",
					},
				} as DataSourceConnection,
			});
			renderWithProvider(source);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			) as HTMLInputElement;
			expect(apiKeyInput.value).toBe("");
		});
	});

	describe("Form Validation", () => {
		it("should enable Connect button by default (even when form is empty)", () => {
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
			expect(connectButton).not.toBeDisabled();
		});

		it("should show validation error toast when clicking Connect with empty form", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
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

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, { target: { value: "invalid-url" } });
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
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

		it("should not show field errors until Connect button is clicked", () => {
			const source = createMockSource();
			renderWithProvider(source);

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);

			// Type invalid values
			fireEvent.change(domainInput, { target: { value: "invalid-url" } });
			fireEvent.blur(domainInput);

			// Errors should NOT appear yet (mode is "onSubmit")
			expect(
				screen.queryByText("form.validation.invalidUrl"),
			).not.toBeInTheDocument();
		});

		it("should proceed with connection when all fields are valid", async () => {
			const source = createMockSource();
			renderWithProvider(source);

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
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

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(mockVerifyMutation.mutateAsync).toHaveBeenCalledWith({
					id: "source-123",
					payload: {
						settings: {
							domain: "https://company.freshservice.com",
						},
						credentials: {
							apiKey: "secret-key",
						},
					},
				});
			});

			await waitFor(() => {
				expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
					id: "source-123",
					data: {
						settings: {
							domain: "https://company.freshservice.com",
						},
						enabled: true,
					},
				});
			});
		});

		it("should show success toast on successful connection", async () => {
			const { ritaToast } = await import("@/components/ui/rita-toast");
			const source = createMockSource();
			renderWithProvider(source);

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.success).toHaveBeenCalledWith({
					title: "success.connectionConfigured",
					description: "descriptions.freshserviceConfigured",
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

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
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

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
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

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connecting/i,
			});
			expect(connectButton).toBeDisabled();

			mockVerifyMutation.isPending = false; // Reset
		});

		it("should disable Connect button when updating", () => {
			mockUpdateMutation.isPending = true;
			const source = createMockSource();
			renderWithProvider(source);

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connecting/i,
			});
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
			expect(screen.getByText("form.alerts.canLeavePage")).toBeInTheDocument();

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

			const cancelButton = screen.getByRole("button", {
				name: /form.buttons.cancel/i,
			});
			fireEvent.click(cancelButton);

			expect(mockOnCancel).toHaveBeenCalledTimes(1);
		});
	});

	describe("Success/Failure Callbacks", () => {
		it("should call onSuccess callback after successful connection", async () => {
			const mockOnSuccess = vi.fn();
			const source = createMockSource();
			renderWithProvider(source, undefined, mockOnSuccess);

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
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

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
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

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);

			fireEvent.change(domainInput, {
				target: { value: "https://company.freshservice.com" },
			});
			fireEvent.change(apiKeyInput, { target: { value: "secret-key" } });

			const connectButton = screen.getByRole("button", {
				name: /form.buttons.connect/i,
			});
			fireEvent.click(connectButton);

			await waitFor(() => {
				expect(ritaToast.error).toHaveBeenCalled();
			});

			// onFailure SHOULD be called on failure
			expect(mockOnFailure).toHaveBeenCalledTimes(1);
		});
	});

	describe("Input Field Types", () => {
		it('should have domain input with type="url"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const domainInput = screen.getByPlaceholderText(
				"form.placeholders.freshserviceDomain",
			);
			expect(domainInput).toHaveAttribute("type", "url");
		});

		it('should have apiKey input with type="password"', () => {
			const source = createMockSource();
			renderWithProvider(source);

			const apiKeyInput = screen.getByPlaceholderText(
				"form.placeholders.apiKey",
			);
			expect(apiKeyInput).toHaveAttribute("type", "password");
		});
	});

	describe("Verification Error Alert", () => {
		it("should show alert when last_verification_error exists", () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					last_verification_error: "Invalid API key provided",
				} as DataSourceConnection,
			});
			renderWithProvider(source);

			expect(
				screen.getByText("form.alerts.verificationFailed"),
			).toBeInTheDocument();
			expect(screen.getByText("Invalid API key provided")).toBeInTheDocument();
		});

		it("should show error message text from verification error", () => {
			const source = createMockSource({
				backendData: {
					...baseBackendData,
					last_verification_error: "Connection timed out",
				} as DataSourceConnection,
			});
			renderWithProvider(source);

			expect(screen.getByText("Connection timed out")).toBeInTheDocument();
			expect(
				screen.getByText("form.alerts.checkCredentials"),
			).toBeInTheDocument();
		});
	});
});
