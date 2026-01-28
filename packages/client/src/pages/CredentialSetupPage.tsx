/**
 * CredentialSetupPage - Public page for IT admins to submit ITSM credentials
 *
 * Accessed via magic link token from organization owner invitation.
 * Supports ServiceNow, Jira, and Confluence credential types.
 * Uses same layout pattern as settings/connections pages.
 *
 * Route: /credential-setup?token=xxx
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { ConnectionStatusCard } from "@/components/connection-sources/ConnectionStatusCard";
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
import { type ConnectionSource, STATUS } from "@/constants/connectionSources";
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
	| "success";

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
 * System icons
 */
const SYSTEM_ICONS: Record<ItsmSystemType, string> = {
	servicenow_itsm: "/connections/icon_servicenow_itsm.svg",
	jira_itsm: "/connections/icon_jira_itsm.svg",
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
	const { t } = useTranslation("credentialDelegation");
	const icon = SYSTEM_ICONS[systemType];
	const title = t(`systems.${systemType}.title`);
	const description = t(`systems.${systemType}.description`);

	return (
		<div className="flex flex-col gap-8 w-3/5 mx-auto py-3">
			<div className="flex flex-col gap-2 px-6">
				<div className="flex items-center gap-2">
					<img
						src={icon}
						alt={`${title} icon`}
						className="w-5 h-5 flex-shrink-0"
					/>
					<h3 className="text-2xl font-medium text-foreground leading-8">
						{title}
					</h3>
				</div>
				<p className="text-sm text-muted-foreground leading-5">{description}</p>
				<p className="text-sm text-muted-foreground leading-5">
					<Trans
						i18nKey="setup.invitedBy"
						ns="credentialDelegation"
						values={{ delegatedBy, orgName }}
						components={{ strong: <strong /> }}
					/>
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
	const { t } = useTranslation("credentialDelegation");
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
			<FormSection title={t("form.authentication")}>
				{verificationError && (
					<StatusAlert variant="error" className="mb-4">
						<p className="font-semibold">{t("form.verificationFailed")}</p>
						<p>{verificationError}</p>
						<p className="text-sm mt-2">{t("form.checkCredentials")}</p>
					</StatusAlert>
				)}

				<FormField
					label={t("form.servicenow.instanceUrl")}
					errors={errors}
					name="instanceUrl"
					required
				>
					<Input
						id="instanceUrl"
						type="url"
						placeholder={t("form.servicenow.instanceUrlPlaceholder")}
						disabled={isSubmitting}
						{...register("instanceUrl", {
							required: t("form.servicenow.instanceUrlRequired"),
							pattern: {
								value: /^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/,
								message: t("form.servicenow.invalidUrl"),
							},
						})}
					/>
				</FormField>

				<FormField
					label={t("form.servicenow.username")}
					errors={errors}
					name="username"
					required
				>
					<Input
						id="username"
						type="text"
						placeholder={t("form.servicenow.usernamePlaceholder")}
						disabled={isSubmitting}
						{...register("username", {
							required: t("form.servicenow.usernameRequired"),
						})}
					/>
				</FormField>

				<FormField
					label={t("form.servicenow.password")}
					errors={errors}
					name="password"
					required
				>
					<Input
						id="password"
						type="password"
						placeholder={t("form.servicenow.passwordPlaceholder")}
						disabled={isSubmitting}
						{...register("password", {
							required: t("form.servicenow.passwordRequired"),
						})}
					/>
				</FormField>

				<div className="flex justify-start gap-2 w-full">
					<Button type="button" onClick={handleConnect} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Spinner className="mr-2" />
								{t("form.connecting")}
							</>
						) : (
							t("form.connect")
						)}
					</Button>
				</div>

				{isSubmitting && (
					<StatusAlert variant="info">
						<p className="text-accent-foreground">
							{t("form.connectionMayTakeTime")}
						</p>
						<p>{t("form.doNotClosePage")}</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}

/**
 * Jira credential form
 */
function JiraCredentialForm({
	onSubmit,
	isSubmitting,
	verificationError,
}: {
	onSubmit: (data: JiraFormData) => void;
	isSubmitting: boolean;
	verificationError?: string | null;
}) {
	const { t } = useTranslation("credentialDelegation");
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

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="credential-form">
			<FormSection title={t("form.authentication")}>
				{verificationError && (
					<StatusAlert variant="error" className="mb-4">
						<p className="font-semibold">{t("form.verificationFailed")}</p>
						<p>{verificationError}</p>
						<p className="text-sm mt-2">{t("form.checkCredentials")}</p>
					</StatusAlert>
				)}

				<FormField
					label={t("form.jira.url")}
					errors={errors}
					name="url"
					required
				>
					<Input
						id="url"
						type="url"
						placeholder={t("form.jira.urlPlaceholder")}
						disabled={isSubmitting}
						{...register("url", {
							required: t("form.jira.urlRequired"),
							pattern: {
								value: /^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/,
								message: t("form.jira.invalidUrl"),
							},
						})}
					/>
				</FormField>

				<FormField
					label={t("form.jira.email")}
					errors={errors}
					name="email"
					required
				>
					<Input
						id="email"
						type="email"
						placeholder={t("form.jira.emailPlaceholder")}
						disabled={isSubmitting}
						{...register("email", {
							required: t("form.jira.emailRequired"),
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: t("form.jira.invalidEmail"),
							},
						})}
					/>
				</FormField>

				<FormField
					label={t("form.jira.apiToken")}
					errors={errors}
					name="token"
					required
				>
					<Input
						id="token"
						type="password"
						placeholder={t("form.jira.apiTokenPlaceholder")}
						disabled={isSubmitting}
						{...register("token", {
							required: t("form.jira.apiTokenRequired"),
						})}
					/>
				</FormField>

				<div className="flex justify-start gap-2 w-full">
					<Button type="button" onClick={handleConnect} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Spinner className="mr-2" />
								{t("form.connecting")}
							</>
						) : (
							t("form.connect")
						)}
					</Button>
				</div>

				{isSubmitting && (
					<StatusAlert variant="info">
						<p className="text-accent-foreground">
							{t("form.connectionMayTakeTime")}
						</p>
						<p>{t("form.doNotClosePage")}</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}

export default function CredentialSetupPage() {
	const { t } = useTranslation("credentialDelegation");
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
	const [lastSubmissionTime, setLastSubmissionTime] = useState<number | null>(
		null,
	);
	const [submittedCredentials, setSubmittedCredentials] = useState<{
		url: string;
		email: string;
	} | null>(null);
	const [countdown, setCountdown] = useState(90);
	const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);

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

		// Ignore stale cached results from before current submission
		if (lastSubmissionTime && statusData.submitted_at) {
			const submittedAt = new Date(statusData.submitted_at).getTime();
			// Allow 5 second tolerance for clock differences
			if (submittedAt < lastSubmissionTime - 5000) {
				return;
			}
		}

		const status = statusData.status as DelegationStatus;

		if (status === "verified") {
			setPageState("success");
			setVerifiedAt(new Date());
		} else if (status === "failed") {
			// Go back to form with error message shown in StatusAlert
			setPageState("form");
			setVerificationError(statusData.error || t("failed.defaultError"));
		}
		// Keep polling for "pending" status
	}, [statusData, pageState, lastSubmissionTime, t]);

	// Countdown timer for success state
	useEffect(() => {
		if (pageState !== "success") return;

		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					window.close();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [pageState]);

	// Handle ServiceNow form submission
	const handleServiceNowSubmit = async (data: ServiceNowFormData) => {
		if (!token) return;

		setPageState("submitting");
		setVerificationError(null);
		setLastSubmissionTime(Date.now());
		setSubmittedCredentials({
			url: data.instanceUrl,
			email: data.username,
		});

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
				setVerifiedAt(new Date());
			} else if (result.status === "failed") {
				// Go back to form with error message
				setPageState("form");
				setVerificationError(t("failed.defaultError"));
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
		setLastSubmissionTime(Date.now());
		setSubmittedCredentials({
			url: data.url,
			email: data.email,
		});

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
				setVerifiedAt(new Date());
			} else if (result.status === "failed") {
				// Go back to form with error message
				setPageState("form");
				setVerificationError(t("failed.defaultError"));
			} else {
				setPageState("verifying");
			}
		} catch {
			setPageState("form");
		}
	};

	// Render loading state
	if (pageState === "loading") {
		return (
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="flex flex-col items-center gap-4">
					<Spinner className="h-8 w-8" aria-label={t("setup.verifyingLink")} />
					<p className="text-sm text-muted-foreground">
						{t("setup.verifyingLink")}
					</p>
				</div>
			</div>
		);
	}

	// Redirect to link expired page for invalid tokens
	if (pageState === "invalid") {
		return (
			<Navigate
				to={`/link-expired?reason=${invalidReason || "not_found"}`}
				replace
			/>
		);
	}

	// Render verifying state (polling)
	if (pageState === "verifying" && verifyData?.system_type) {
		const icon = SYSTEM_ICONS[verifyData.system_type];
		const systemName = t(`systems.${verifyData.system_type}.title`);
		return (
			<div className="flex-1 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4">
							<img
								src={icon}
								alt={`${systemName} icon`}
								className="w-12 h-12"
							/>
						</div>
						<CardTitle>{t("verifying.title")}</CardTitle>
						<CardDescription>
							{t("verifying.description", { systemName })}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center justify-center py-4">
						<Spinner className="h-8 w-8" aria-label={t("verifying.title")} />
						<p className="mt-4 text-sm text-muted-foreground">
							{t("verifying.pleaseWait")}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Render success state
	if (pageState === "success" && verifyData?.system_type) {
		const formattedTime = verifiedAt
			? verifiedAt.toLocaleTimeString("en-US", {
					hour: "numeric",
					minute: "2-digit",
					hour12: true,
				})
			: "";

		const handleExitSession = () => {
			window.close();
		};

		// Create mock ConnectionSource for ConnectionStatusCard
		const successSource: ConnectionSource = {
			id: delegationId || "delegation",
			type: verifyData.system_type,
			title: t(`systems.${verifyData.system_type}.title`),
			status: STATUS.CONNECTED,
			lastSync: t("success.updatedAt", { time: formattedTime }),
			badges: [],
			settings:
				verifyData.system_type === "servicenow_itsm"
					? {
							instanceUrl: submittedCredentials?.url || "",
							username: submittedCredentials?.email || "",
						}
					: {
							url: submittedCredentials?.url || "",
							email: submittedCredentials?.email || "",
						},
		};

		return (
			<>
				<PageHeader
					systemType={verifyData.system_type}
					orgName={verifyData.org_name || ""}
					delegatedBy={verifyData.delegated_by || ""}
				/>
				<div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
					<p className="text-lg text-muted-foreground">
						{t("success.windowCloses", { seconds: countdown })}
					</p>

					<div className="w-3/5 max-w-lg">
						<ConnectionStatusCard source={successSource} hideStatusMessage />
					</div>

					<Button onClick={handleExitSession} className="w-full max-w-lg">
						{t("success.exitSession")}
					</Button>
				</div>
			</>
		);
	}

	// Render form state
	const systemType = verifyData?.system_type;
	const isSubmitting = pageState === "submitting";

	if (!systemType || !verifyData?.org_name || !verifyData?.delegated_by) {
		return (
			<div className="flex-1 flex items-center justify-center p-4">
				<p className="text-muted-foreground">{t("setup.loading")}</p>
			</div>
		);
	}

	return (
		<>
			<PageHeader
				systemType={systemType}
				orgName={verifyData.org_name}
				delegatedBy={verifyData.delegated_by}
			/>
			<div className="flex-1 inline-flex flex-col items-center gap-4 w-full px-6 md:px-12 lg:px-24">
				{/* Header with icon, title, description */}

				{/* Form content */}
				<div className="w-full max-w-2xl mx-auto flex flex-col gap-8 px-4 md:px-0">
					<div className="flex flex-col gap-8">
						<h2 className="text-2xl">Configure</h2>
					</div>
					{/* API Error */}
					{submitMutation.error && (
						<StatusAlert variant="error">
							<p>{submitMutation.error.error || t("form.submitFailed")}</p>
						</StatusAlert>
					)}

					{!submitMutation.error && !verificationError && (
						<StatusAlert variant="info" className="mb-4">
							<p className="font-semibold">{t("form.setupAlertTitle")}</p>
							<p className="font-thin">{t("form.setupAlertBody")}</p>
						</StatusAlert>
					)}

					{/* Render form based on system type */}
					{systemType === "servicenow_itsm" && (
						<ServiceNowCredentialForm
							onSubmit={handleServiceNowSubmit}
							isSubmitting={isSubmitting}
							verificationError={verificationError}
						/>
					)}
					{systemType === "jira_itsm" && (
						<JiraCredentialForm
							onSubmit={handleJiraSubmit}
							isSubmitting={isSubmitting}
							verificationError={verificationError}
						/>
					)}
				</div>
			</div>
		</>
	);
}
