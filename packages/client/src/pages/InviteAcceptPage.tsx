/**
 * InviteAcceptPage - Public page for accepting user invitations
 *
 * Displays invitation details and allows invited users to create their account
 * with password and profile information. Uses single-email verification flow.
 *
 * Route: /invite?token=<invitation_token>
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { StatusAlert } from "@/components/ui/status-alert";
import {
	useAcceptInvitation,
	useVerifyInvitation,
} from "@/hooks/api/useInvitations";
import { MIN_PASSWORD_LENGTH, PASSWORD_REGEX } from "@/lib/validation";
import {
	type InvitationAPIError,
	InvitationErrorCode,
	type InviteAcceptFormData,
} from "@/types/invitations";

/**
 * Get error message for invitation API errors
 */
function getErrorMessage(
	error: InvitationAPIError,
	errorMessages: Record<InvitationErrorCode, string>,
	fallback: string,
): string {
	return errorMessages[error.error] || error.message || fallback;
}

export default function InviteAcceptPage() {
	const { t } = useTranslation("auth");
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const navigate = useNavigate();
	const [acceptProgress, setAcceptProgress] = useState(0);
	const [showSuccess, setShowSuccess] = useState(false);

	// Translated validation messages for Zod schema
	const validationMessages = useMemo(
		() => ({
			passwordMinLength: t("validation.passwordMinLength", {
				count: MIN_PASSWORD_LENGTH,
			}),
			passwordComplexity: t("validation.passwordComplexity"),
			firstNameRequired: t("validation.firstNameRequired"),
			lastNameRequired: t("validation.lastNameRequired"),
		}),
		[t],
	);

	// Create schema with translations, memoized
	const inviteAcceptSchema = useMemo(
		() =>
			z.object({
				password: z
					.string()
					.transform((val) => val.trim())
					.pipe(
						z
							.string()
							.min(MIN_PASSWORD_LENGTH, validationMessages.passwordMinLength)
							.refine((val) => PASSWORD_REGEX.test(val), {
								message: validationMessages.passwordComplexity,
							}),
					),
				firstName: z
					.string()
					.transform((val) => val.trim())
					.pipe(z.string().min(1, validationMessages.firstNameRequired)),
				lastName: z
					.string()
					.transform((val) => val.trim())
					.pipe(z.string().min(1, validationMessages.lastNameRequired)),
			}),
		[validationMessages],
	);

	// Error messages for API errors
	const errorMessages = useMemo(
		(): Record<InvitationErrorCode, string> => ({
			[InvitationErrorCode.INVALID_TOKEN]: t("invite.errors.invalidToken"),
			[InvitationErrorCode.INVITATION_EXPIRED]: t("invite.errors.expired"),
			[InvitationErrorCode.INVITATION_ALREADY_ACCEPTED]: t(
				"invite.errors.alreadyAccepted",
			),
			[InvitationErrorCode.INVITATION_CANCELLED]: t("invite.errors.cancelled"),
			[InvitationErrorCode.PASSWORD_TOO_WEAK]: t("invite.errors.passwordWeak"),
			[InvitationErrorCode.PASSWORD_REQUIRED]: t(
				"invite.errors.passwordRequired",
			),
			[InvitationErrorCode.FIRST_NAME_REQUIRED]: t(
				"invite.errors.firstNameRequired",
			),
			[InvitationErrorCode.LAST_NAME_REQUIRED]: t(
				"invite.errors.lastNameRequired",
			),
			[InvitationErrorCode.SERVER_ERROR]: t("invite.errors.serverError"),
			[InvitationErrorCode.INVALID_EMAIL]: t("invite.errors.invalidEmail"),
			[InvitationErrorCode.DUPLICATE_PENDING]: t(
				"invite.errors.duplicatePending",
			),
			[InvitationErrorCode.USER_ALREADY_EXISTS]: t("invite.errors.userExists"),
			[InvitationErrorCode.BATCH_SIZE_EXCEEDED]: t(
				"invite.errors.batchExceeded",
			),
			[InvitationErrorCode.TENANT_LIMIT_EXCEEDED]: t(
				"invite.errors.tenantLimit",
			),
			[InvitationErrorCode.UNAUTHORIZED]: t("invite.errors.unauthorized"),
			[InvitationErrorCode.FORBIDDEN]: t("invite.errors.unauthorized"),
		}),
		[t],
	);

	// Verify invitation token on page load
	const {
		data: verificationData,
		isLoading: isVerifying,
		error: verifyError,
	} = useVerifyInvitation(token || "", !!token);

	// Accept invitation mutation
	const {
		mutate: acceptInvitation,
		isPending: isAccepting,
		error: acceptError,
	} = useAcceptInvitation();

	// Form setup with react-hook-form + Zod
	// Note: Email is not in the form - it comes from verificationData and is display-only
	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
	} = useForm<InviteAcceptFormData>({
		resolver: zodResolver(inviteAcceptSchema),
		mode: "onChange",
		defaultValues: {
			password: "",
			firstName: "",
			lastName: "",
		},
	});

	// Simulate progress bar during account creation
	useEffect(() => {
		if (isAccepting) {
			setAcceptProgress(0);
			const interval = setInterval(() => {
				setAcceptProgress((prev) => {
					if (prev >= 90) {
						clearInterval(interval);
						return 90;
					}
					return prev + 10;
				});
			}, 200);
			return () => clearInterval(interval);
		}
	}, [isAccepting]);

	// Handle form submission
	const onSubmit = (data: InviteAcceptFormData) => {
		if (!token) {
			console.error("No invitation token provided");
			return;
		}

		acceptInvitation(
			{
				token,
				password: data.password,
				firstName: data.firstName,
				lastName: data.lastName,
			},
			{
				onSuccess: () => {
					setAcceptProgress(100);
					setShowSuccess(true);
					// Redirect to login after 3 seconds
					setTimeout(() => {
						navigate("/login");
					}, 3000);
				},
				onError: (err) => {
					setAcceptProgress(0);
					console.error("Failed to accept invitation:", err);
				},
			},
		);
	};

	// Loading state while verifying token
	if (isVerifying) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
				<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-center items-center gap-6">
					<Loader2 className="h-8 w-8 animate-spin text-white" />
					<p className="text-white text-sm">{t("invite.verifying")}</p>
				</div>
			</div>
		);
	}

	// Error state for invalid/expired/cancelled invitations
	if (verifyError || !verificationData?.valid) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
				<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-start items-center gap-6">
					<div className="w-full flex flex-col justify-start items-center gap-6 py-4">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-red-400" />
						</div>
						<div className="w-full flex flex-col justify-start items-center">
							<h2 className="text-white text-3xl font-normal text-center leading-9 font-serif pb-2">
								{t("invite.invalidTitle")}
							</h2>
							<p className="text-white text-sm text-center leading-5">
								{verifyError
									? getErrorMessage(
											verifyError,
											errorMessages,
											t("invite.errors.default"),
										)
									: t("invite.invalidFallback")}
							</p>
						</div>
						<div className="w-full">
							<Button className="w-full" onClick={() => navigate("/login")}>
								{t("invite.goToLogin")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Success state after account creation
	if (showSuccess) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
				<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-start items-center gap-6">
					<div className="w-full flex flex-col justify-start items-center gap-6 py-4">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-8 w-8 text-green-400" />
						</div>
						<div className="w-full flex flex-col justify-start items-center">
							<h2 className="text-white text-3xl font-normal text-center leading-9 font-serif pb-2">
								{t("invite.successTitle")}
							</h2>
							<p className="text-white text-sm text-center leading-5 mb-4">
								{t("invite.successMessage")}
							</p>
							<p className="text-white/70 text-sm text-center leading-5">
								{t("invite.redirecting")}
							</p>
						</div>
						<div className="w-full">
							<Button className="w-full" onClick={() => navigate("/login")}>
								{t("invite.goToLoginNow")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Main form for accepting invitation
	return (
		<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
			<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-start items-center gap-6">
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="w-full flex flex-col justify-start items-center gap-6 py-4"
				>
					<div className="w-full flex flex-col justify-start items-center gap-6">
						{/* Logo */}
						<div className="w-full flex justify-center items-start">
							<div className="w-6 h-6 flex justify-start items-center">
								<img
									src="/logo-mark.svg"
									alt="RITA Go Logo"
									width="24"
									height="24"
								/>
							</div>
						</div>

						{/* Header */}
						<div className="w-full flex flex-col justify-start items-center">
							<div className="w-full flex justify-center items-center pb-2">
								<h2 className="text-white text-3xl font-normal text-center leading-9 font-serif">
									{t("invite.title")}
								</h2>
							</div>
							<div className="w-full flex justify-center items-center">
								<p className="text-white text-sm text-center leading-5">
									{t("invite.subtitle")}
								</p>
							</div>
						</div>
					</div>

					{/* Form Fields */}
					<div className="w-full flex flex-col justify-center items-center gap-5">
						{/* API Error Alert */}
						{acceptError && (
							<StatusAlert variant="warning">
								{getErrorMessage(
									acceptError,
									errorMessages,
									t("invite.errors.default"),
								)}
							</StatusAlert>
						)}

						{/* Progress Bar (shown during submission) */}
						{isAccepting && (
							<div className="w-full space-y-2">
								<Progress value={acceptProgress} className="w-full" />
								<p className="text-white text-sm text-center">
									{t("invite.creating")}
								</p>
							</div>
						)}

						{/* Email (read-only, display only - NOT submitted) */}
						<div className="w-full space-y-2">
							<Label htmlFor="email" className="text-white text-sm">
								{t("invite.emailLabel")}
							</Label>
							<Input
								id="email"
								type="email"
								value={verificationData?.invitation?.email || ""}
								disabled
								readOnly
								className="opacity-50 text-white"
							/>
						</div>

						{/* First Name and Last Name */}
						<div className="w-full flex gap-5">
							<div className="flex-1 space-y-2">
								<Label htmlFor="firstName" className="text-white text-sm">
									{t("invite.firstNameLabel")}
								</Label>
								<Input
									id="firstName"
									type="text"
									placeholder=""
									{...register("firstName")}
									disabled={isAccepting}
									className="text-white placeholder:text-gray-400"
								/>
								{errors.firstName && (
									<p className="text-sm text-red-400">
										{errors.firstName.message}
									</p>
								)}
							</div>
							<div className="flex-1 space-y-2">
								<Label htmlFor="lastName" className="text-white text-sm">
									{t("invite.lastNameLabel")}
								</Label>
								<Input
									id="lastName"
									type="text"
									placeholder=""
									{...register("lastName")}
									disabled={isAccepting}
									className="text-white placeholder:text-gray-400"
								/>
								{errors.lastName && (
									<p className="text-sm text-red-400">
										{errors.lastName.message}
									</p>
								)}
							</div>
						</div>

						{/* Password */}
						<div className="w-full space-y-2">
							<Label htmlFor="password" className="text-white text-sm">
								{t("invite.passwordLabel")}
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								{...register("password")}
								disabled={isAccepting}
								className="text-white placeholder:text-gray-400"
							/>
							{errors.password && (
								<p className="text-sm text-red-400">
									{errors.password.message}
								</p>
							)}
						</div>

						{/* Submit Button */}
						<div className="w-full">
							<Button
								type="submit"
								className="w-full"
								disabled={!isValid || isAccepting}
							>
								{isAccepting && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{isAccepting ? t("invite.creatingButton") : t("invite.acceptButton")}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
