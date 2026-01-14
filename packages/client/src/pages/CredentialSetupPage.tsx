/**
 * CredentialSetupPage - Public page for IT admins to submit ITSM credentials
 *
 * Accessed via magic link token from organization owner invitation.
 * Supports ServiceNow, Jira, and Confluence credential types.
 * Uses same layout pattern as settings/connections pages.
 *
 * Route: /credential-setup?token=xxx
 */

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useSearchParams } from "react-router-dom";
import PublicPageLayout from "@/components/layouts/PublicPageLayout";
import ConnectionsForm from "@/components/connection-sources/form-elements/ConnectionsForm";
import FormField from "@/components/connection-sources/form-elements/FormField";
import FormSection from "@/components/connection-sources/form-elements/FormSection";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import {
	type DelegationStatus,
	type ItsmSystemType,
	useDelegationStatus,
	useSubmitCredentials,
	useVerifyDelegation,
} from "@/hooks/api/useCredentialDelegations";

/**
 * Page states
 */
type PageState =
	| "loading"
	| "invalid"
	| "form"
	| "submitting"
	| "verifying"
	| "success"
	| "failed";

/**
 * ServiceNow form data
 */
interface ServiceNowFormData {
	instanceUrl: string;
	username: string;
	password: string;
}

/**
 * Jira/Confluence form data
 */
interface JiraFormData {
	url: string;
	email: string;
	token: string;
}

/**
 * System metadata for display
 */
const SYSTEM_METADATA: Record<
	ItsmSystemType,
	{ title: string; icon: string; description: string }
> = {
	servicenow: {
		title: "ServiceNow",
		icon: "/connections/icon_servicenow.svg",
		description:
			"Connect your ServiceNow instance to enable RITA to create and manage tickets.",
	},
	jira: {
		title: "Jira",
		icon: "/connections/icon_jira.svg",
		description:
			"Connect your Jira instance to enable RITA to create and manage issues.",
	},
};


/**
 * Page header component matching settings pages style
 */
function PageHeader({
	systemType,
	orgName,
	delegatedBy,
}: {
	systemType: ItsmSystemType;
	orgName: string;
	delegatedBy: string;
}) {
	const metadata = SYSTEM_METADATA[systemType];

	return (
		<div className="flex flex-col gap-8 w-full mt-4 px-4 md:px-0">
			<div className="flex flex-col gap-2 px-6">
				<div className="flex items-center gap-2">
					<img
						src={metadata.icon}
						alt={`${metadata.title} icon`}
						className="w-5 h-5 flex-shrink-0"
					/>
					<h3 className="text-2xl font-medium text-foreground leading-8">
						{metadata.title}
					</h3>
				</div>
				<p className="text-sm text-muted-foreground leading-5">
					{metadata.description}
				</p>
				<p className="text-sm text-muted-foreground leading-5">
					<strong>{delegatedBy}</strong> from <strong>{orgName}</strong> has
					invited you to set up this connection.
				</p>
			</div>
			<Separator orientation="horizontal" />
		</div>
	);
}

/**
 * ServiceNow credential form
 */
function ServiceNowCredentialForm({
	onSubmit,
	isSubmitting,
	verificationError,
}: {
	onSubmit: (data: ServiceNowFormData) => void;
	isSubmitting: boolean;
	verificationError?: string | null;
}) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
		trigger,
	} = useForm<ServiceNowFormData>({
		mode: "onSubmit",
		defaultValues: {
			instanceUrl: "",
			username: "",
			password: "",
		},
	});

	const handleConnect = async () => {
		const isValid = await trigger();
		if (!isValid) return;
		onSubmit(getValues());
	};

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="credential-form">
			<FormSection title="Authentication">
				{verificationError && (
					<StatusAlert variant="error" className="mb-4">
						<p className="font-semibold">Verification Failed</p>
						<p>{verificationError}</p>
						<p className="text-sm mt-2">
							Please check your credentials and try again.
						</p>
					</StatusAlert>
				)}

				<FormField label="Instance URL" errors={errors} name="instanceUrl" required>
					<Input
						id="instanceUrl"
						type="url"
						placeholder="https://your-instance.service-now.com"
						disabled={isSubmitting}
						{...register("instanceUrl", {
							required: "Instance URL is required",
							pattern: {
								value: /^https?:\/\/.+/,
								message: "Please enter a valid URL",
							},
						})}
					/>
				</FormField>

				<FormField label="Username" errors={errors} name="username" required>
					<Input
						id="username"
						type="text"
						placeholder="service_account"
						disabled={isSubmitting}
						{...register("username", {
							required: "Username is required",
						})}
					/>
				</FormField>

				<FormField label="Password" errors={errors} name="password" required>
					<Input
						id="password"
						type="password"
						placeholder="Enter password"
						disabled={isSubmitting}
						{...register("password", {
							required: "Password is required",
						})}
					/>
				</FormField>

				<div className="flex justify-start gap-2 w-full">
					<Button
						type="button"
						onClick={handleConnect}
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<Spinner className="mr-2" />
								Connecting...
							</>
						) : (
							"Connect"
						)}
					</Button>
				</div>

				{isSubmitting && (
					<StatusAlert variant="info">
						<p className="text-accent-foreground">Connection may take time</p>
						<p>Please do not close this page while connecting</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}

/**
 * Jira/Confluence credential form
 */
function JiraCredentialForm({
	systemType,
	onSubmit,
	isSubmitting,
	verificationError,
}: {
	systemType: "jira" | "confluence";
	onSubmit: (data: JiraFormData) => void;
	isSubmitting: boolean;
	verificationError?: string | null;
}) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
		trigger,
	} = useForm<JiraFormData>({
		mode: "onSubmit",
		defaultValues: {
			url: "",
			email: "",
			token: "",
		},
	});

	const handleConnect = async () => {
		const isValid = await trigger();
		if (!isValid) return;
		onSubmit(getValues());
	};

	const placeholder =
		systemType === "jira"
			? "https://your-company.atlassian.net"
			: "https://your-company.atlassian.net/wiki";

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="credential-form">
			<FormSection title="Authentication">
				{verificationError && (
					<StatusAlert variant="error" className="mb-4">
						<p className="font-semibold">Verification Failed</p>
						<p>{verificationError}</p>
						<p className="text-sm mt-2">
							Please check your credentials and try again.
						</p>
					</StatusAlert>
				)}

				<FormField label="URL" errors={errors} name="url" required>
					<Input
						id="url"
						type="url"
						placeholder={placeholder}
						disabled={isSubmitting}
						{...register("url", {
							required: "URL is required",
							pattern: {
								value: /^https?:\/\/.+/,
								message: "Please enter a valid URL",
							},
						})}
					/>
				</FormField>

				<FormField label="User email" errors={errors} name="email" required>
					<Input
						id="email"
						type="email"
						placeholder="you@company.com"
						disabled={isSubmitting}
						{...register("email", {
							required: "Email is required",
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: "Please enter a valid email address",
							},
						})}
					/>
				</FormField>

				<FormField label="API token" errors={errors} name="token" required>
					<Input
						id="token"
						type="password"
						placeholder="Enter API token"
						disabled={isSubmitting}
						{...register("token", {
							required: "API token is required",
						})}
					/>
				</FormField>

				<div className="flex justify-start gap-2 w-full">
					<Button
						type="button"
						onClick={handleConnect}
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<Spinner className="mr-2" />
								Connecting...
							</>
						) : (
							"Connect"
						)}
					</Button>
				</div>

				{isSubmitting && (
					<StatusAlert variant="info">
						<p className="text-accent-foreground">Connection may take time</p>
						<p>Please do not close this page while connecting</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}

export default function CredentialSetupPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") || "";

	const [pageState, setPageState] = useState<PageState>("loading");
	const [invalidReason, setInvalidReason] = useState<
		"expired" | "not_found" | undefined
	>();
	const [verificationError, setVerificationError] = useState<string | null>(
		null,
	);
	const [delegationId, setDelegationId] = useState<string | null>(null);

	// Verify token on load
	const {
		data: verifyData,
		isLoading: isVerifying,
		error: verifyError,
	} = useVerifyDelegation(token, !!token);

	// Submit credentials mutation
	const submitMutation = useSubmitCredentials();

	// Poll status after submission
	const shouldPollStatus = Boolean(
		pageState === "verifying" && delegationId && token,
	);
	const { data: statusData } = useDelegationStatus(
		token,
		shouldPollStatus,
		shouldPollStatus ? 2000 : false,
	);

	// Handle token verification result
	useEffect(() => {
		if (!token) {
			setPageState("invalid");
			setInvalidReason("not_found");
			return;
		}

		if (isVerifying) {
			setPageState("loading");
			return;
		}

		if (verifyError) {
			setPageState("invalid");
			setInvalidReason("not_found");
			return;
		}

		if (verifyData) {
			if (verifyData.valid) {
				setPageState("form");
			} else {
				setPageState("invalid");
				setInvalidReason(verifyData.reason);
			}
		}
	}, [token, isVerifying, verifyError, verifyData]);

	// Handle status polling result
	useEffect(() => {
		if (!statusData || pageState !== "verifying") return;

		const status = statusData.status as DelegationStatus;

		if (status === "verified") {
			setPageState("success");
		} else if (status === "failed") {
			setPageState("failed");
			setVerificationError(
				statusData.error || "Credential verification failed",
			);
		}
		// Keep polling for "pending" status
	}, [statusData, pageState]);

	// Handle ServiceNow form submission
	const handleServiceNowSubmit = async (data: ServiceNowFormData) => {
		if (!token) return;

		setPageState("submitting");
		setVerificationError(null);

		try {
			const result = await submitMutation.mutateAsync({
				token,
				credentials: {
					instance_url: data.instanceUrl,
					username: data.username,
					password: data.password,
				},
			});

			setDelegationId(result.delegation_id);

			if (result.status === "verified") {
				setPageState("success");
			} else if (result.status === "failed") {
				setPageState("failed");
				setVerificationError("Credential verification failed");
			} else {
				setPageState("verifying");
			}
		} catch {
			setPageState("form");
		}
	};

	// Handle Jira/Confluence form submission
	const handleJiraSubmit = async (data: JiraFormData) => {
		if (!token) return;

		setPageState("submitting");
		setVerificationError(null);

		try {
			const result = await submitMutation.mutateAsync({
				token,
				credentials: {
					instance_url: data.url,
					email: data.email,
					api_token: data.token,
				},
			});

			setDelegationId(result.delegation_id);

			if (result.status === "verified") {
				setPageState("success");
			} else if (result.status === "failed") {
				setPageState("failed");
				setVerificationError("Credential verification failed");
			} else {
				setPageState("verifying");
			}
		} catch {
			setPageState("form");
		}
	};

	// Handle retry
	const handleRetry = () => {
		setPageState("form");
		setVerificationError(null);
		submitMutation.reset();
	};

	// Render loading state
	if (pageState === "loading") {
		return (
			<PublicPageLayout>
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="flex flex-col items-center gap-4">
						<Spinner className="h-8 w-8" aria-label="Verifying link" />
						<p className="text-sm text-muted-foreground">Verifying link...</p>
					</div>
				</div>
			</PublicPageLayout>
		);
	}

	// Redirect to link expired page for invalid tokens
	if (pageState === "invalid") {
		return <Navigate to={`/link-expired?reason=${invalidReason || "not_found"}`} replace />;
	}

	// Render verifying state (polling)
	if (pageState === "verifying" && verifyData?.system_type) {
		const metadata = SYSTEM_METADATA[verifyData.system_type];
		return (
			<PublicPageLayout>
				<div className="flex-1 flex items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4">
								<img
									src={metadata.icon}
									alt={`${metadata.title} icon`}
									className="w-12 h-12"
								/>
							</div>
							<CardTitle>Verifying Credentials</CardTitle>
							<CardDescription>
								We are testing your connection to {metadata.title}. This may
								take a moment.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col items-center justify-center py-4">
							<Spinner className="h-8 w-8" aria-label="Verifying credentials" />
							<p className="mt-4 text-sm text-muted-foreground">
								Please do not close this page...
							</p>
						</CardContent>
					</Card>
				</div>
			</PublicPageLayout>
		);
	}

	// Render success state
	if (pageState === "success" && verifyData?.system_type) {
		const metadata = SYSTEM_METADATA[verifyData.system_type];
		return (
			<PublicPageLayout>
				<div className="flex-1 flex items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
								<CheckCircle2
									className="h-6 w-6 text-green-600"
									aria-hidden="true"
								/>
							</div>
							<CardTitle>Credentials Verified</CardTitle>
							<CardDescription>
								Your {metadata.title} credentials have been successfully
								verified and saved. You can close this page.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<StatusAlert variant="success">
								<p>
									The connection to {metadata.title} is now active for{" "}
									<strong>{verifyData?.org_name}</strong>.
								</p>
							</StatusAlert>
						</CardContent>
					</Card>
				</div>
			</PublicPageLayout>
		);
	}

	// Render failed state
	if (pageState === "failed" && verifyData?.system_type) {
		const metadata = SYSTEM_METADATA[verifyData.system_type];
		return (
			<PublicPageLayout>
				<div className="flex-1 flex items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4">
								<img
									src={metadata.icon}
									alt={`${metadata.title} icon`}
									className="w-12 h-12"
								/>
							</div>
							<CardTitle>Verification Failed</CardTitle>
							<CardDescription>
								We could not verify your {metadata.title} credentials. Please
								check your information and try again.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{verificationError && (
								<StatusAlert variant="error">
									<p>{verificationError}</p>
								</StatusAlert>
							)}
							<Button onClick={handleRetry} className="w-full">
								Try Again
							</Button>
						</CardContent>
					</Card>
				</div>
			</PublicPageLayout>
		);
	}

	// Render form state
	const systemType = verifyData?.system_type;
	const isSubmitting = pageState === "submitting";

	if (!systemType || !verifyData?.org_name || !verifyData?.delegated_by) {
		return (
			<PublicPageLayout>
				<div className="flex-1 flex items-center justify-center p-4">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</PublicPageLayout>
		);
	}

	return (
		<PublicPageLayout>
            <PageHeader
                systemType={systemType}
                orgName={verifyData.org_name}
                delegatedBy={verifyData.delegated_by}
            />
			<div className="flex-1 inline-flex flex-col items-center gap-8 w-full px-6 md:px-12 lg:px-24">
				{/* Header with icon, title, description */}


				{/* Form content */}
				<div className="w-full max-w-2xl mx-auto flex flex-col gap-8 px-4 md:px-0">
					{/* API Error */}
					{submitMutation.error && (
						<StatusAlert variant="error">
							<p>
								{submitMutation.error.error ||
									"Failed to submit credentials. Please try again."}
							</p>
						</StatusAlert>
					)}

					{/* Render form based on system type */}
					{systemType === "servicenow" && (
						<ServiceNowCredentialForm
							onSubmit={handleServiceNowSubmit}
							isSubmitting={isSubmitting}
							verificationError={verificationError}
						/>
					)}
					{systemType === "jira" && (
						<JiraCredentialForm
							systemType={systemType}
							onSubmit={handleJiraSubmit}
							isSubmitting={isSubmitting}
							verificationError={verificationError}
						/>
					)}

					{/* Expiry notice */}
					{verifyData?.expires_at && (
						<p className="text-xs text-muted-foreground">
							This link expires on{" "}
							{new Date(verifyData.expires_at).toLocaleDateString()}
						</p>
					)}
				</div>
			</div>
		</PublicPageLayout>
	);
}
