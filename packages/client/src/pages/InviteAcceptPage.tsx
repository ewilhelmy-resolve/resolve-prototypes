/**
 * InviteAcceptPage - Public page for accepting user invitations
 *
 * Displays invitation details and allows invited users to create their account
 * with password and profile information. Uses single-email verification flow.
 *
 * Route: /invite?token=<invitation_token>
 */

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Mail,
	Shield,
	User,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	useAcceptInvitation,
	useVerifyInvitation,
} from "@/hooks/api/useInvitations";
import {
	InvitationErrorCode,
	type InviteAcceptFormData,
	type InvitationAPIError,
} from "@/types/invitations";

/**
 * Zod Schema for Invitation Accept Form
 * Enforces password complexity and field requirements
 */
const inviteAcceptSchema = z
	.object({
		email: z.string().email("Invalid email address"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.refine(
				(val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(val),
				{
					message: "Password must contain uppercase, lowercase, number, and special character",
				},
			),
		confirmPassword: z.string(),
		firstName: z.string().min(1, "First name is required"),
		lastName: z.string().min(1, "Last name is required"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

/**
 * Error code to user-friendly message mapping
 */
function getErrorMessage(error: InvitationAPIError): string {
	switch (error.error) {
		case InvitationErrorCode.INVALID_TOKEN:
			return "This invitation link is invalid";
		case InvitationErrorCode.INVITATION_EXPIRED:
			return "This invitation has expired. Please request a new invitation.";
		case InvitationErrorCode.INVITATION_ALREADY_ACCEPTED:
			return "This invitation has already been accepted. You can log in with your credentials.";
		case InvitationErrorCode.INVITATION_CANCELLED:
			return "This invitation has been cancelled by an administrator.";
		case InvitationErrorCode.PASSWORD_TOO_WEAK:
			return "Password does not meet security requirements";
		case InvitationErrorCode.PASSWORD_REQUIRED:
			return "Password is required";
		case InvitationErrorCode.FIRST_NAME_REQUIRED:
			return "First name is required";
		case InvitationErrorCode.LAST_NAME_REQUIRED:
			return "Last name is required";
		case InvitationErrorCode.SERVER_ERROR:
			return "Server error occurred. Please try again later";
		default:
			return error.message || "Failed to accept invitation";
	}
}

export default function InviteAcceptPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const navigate = useNavigate();
	const [acceptProgress, setAcceptProgress] = useState(0);
	const [showSuccess, setShowSuccess] = useState(false);

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
	} = useAcceptInvitation(token || "");

	// Form setup with react-hook-form + Zod
	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
		setValue,
	} = useForm<InviteAcceptFormData>({
		resolver: zodResolver(inviteAcceptSchema),
		mode: "onChange",
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			firstName: "",
			lastName: "",
		},
	});

	// Pre-fill email when verification succeeds
	useEffect(() => {
		if (verificationData?.email) {
			setValue("email", verificationData.email, { shouldValidate: true });
		}
	}, [verificationData, setValue]);

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
		acceptInvitation(
			{
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
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Card className="w-full max-w-md">
					<CardContent className="flex flex-col items-center gap-4 py-8">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
						<p className="text-muted-foreground">Verifying invitation...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state for invalid/expired/cancelled invitations
	if (verifyError || !verificationData?.valid) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Card className="w-full max-w-md">
					<CardHeader>
						<div className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-destructive" />
							<CardTitle>Invalid Invitation</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Unable to process invitation</AlertTitle>
							<AlertDescription>
								{verifyError ? getErrorMessage(verifyError) : "This invitation link is no longer valid."}
							</AlertDescription>
						</Alert>
					</CardContent>
					<CardFooter>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => navigate("/login")}
						>
							Go to Login
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	// Success state after account creation
	if (showSuccess) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Card className="w-full max-w-md">
					<CardHeader>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-green-600" />
							<CardTitle>Account Created Successfully!</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert className="border-green-500 bg-green-50 dark:bg-green-950">
							<CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
							<AlertDescription className="text-green-800 dark:text-green-200">
								Your account has been created successfully. You can now log in with
								your credentials.
							</AlertDescription>
						</Alert>
						<p className="text-sm text-muted-foreground text-center">
							Redirecting to login page in 3 seconds...
						</p>
					</CardContent>
					<CardFooter>
						<Button className="w-full" onClick={() => navigate("/login")}>
							Go to Login Now
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	// Main form for accepting invitation
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Accept Invitation</CardTitle>
					<CardDescription>
						You've been invited by {verificationData.invitedBy} to join as a{" "}
						{verificationData.role}
					</CardDescription>
				</CardHeader>

				<form onSubmit={handleSubmit(onSubmit)}>
					<CardContent className="space-y-4">
						{/* API Error Alert */}
						{acceptError && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									{getErrorMessage(acceptError)}
								</AlertDescription>
							</Alert>
						)}

						{/* Progress Bar (shown during submission) */}
						{isAccepting && (
							<div className="space-y-2">
								<Progress value={acceptProgress} className="w-full" />
								<p className="text-sm text-muted-foreground text-center">
									Creating your account...
								</p>
							</div>
						)}

						{/* Email (read-only, pre-filled) */}
						<div className="space-y-2">
							<Label htmlFor="email">
								<Mail className="inline h-4 w-4 mr-1" />
								Email
							</Label>
							<Input
								id="email"
								type="email"
								{...register("email")}
								disabled
								className="bg-muted"
							/>
							{errors.email && (
								<p className="text-sm text-destructive">{errors.email.message}</p>
							)}
						</div>

						{/* First Name */}
						<div className="space-y-2">
							<Label htmlFor="firstName">
								<User className="inline h-4 w-4 mr-1" />
								First Name
							</Label>
							<Input
								id="firstName"
								type="text"
								placeholder="John"
								{...register("firstName")}
								disabled={isAccepting}
							/>
							{errors.firstName && (
								<p className="text-sm text-destructive">
									{errors.firstName.message}
								</p>
							)}
						</div>

						{/* Last Name */}
						<div className="space-y-2">
							<Label htmlFor="lastName">
								<User className="inline h-4 w-4 mr-1" />
								Last Name
							</Label>
							<Input
								id="lastName"
								type="text"
								placeholder="Doe"
								{...register("lastName")}
								disabled={isAccepting}
							/>
							{errors.lastName && (
								<p className="text-sm text-destructive">
									{errors.lastName.message}
								</p>
							)}
						</div>

						{/* Password */}
						<div className="space-y-2">
							<Label htmlFor="password">
								<Shield className="inline h-4 w-4 mr-1" />
								Password
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								{...register("password")}
								disabled={isAccepting}
							/>
							{errors.password && (
								<p className="text-sm text-destructive">
									{errors.password.message}
								</p>
							)}
							<p className="text-xs text-muted-foreground">
								Min 8 characters with uppercase, lowercase, number, and special
								character
							</p>
						</div>

						{/* Confirm Password */}
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">
								<Shield className="inline h-4 w-4 mr-1" />
								Confirm Password
							</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								{...register("confirmPassword")}
								disabled={isAccepting}
							/>
							{errors.confirmPassword && (
								<p className="text-sm text-destructive">
									{errors.confirmPassword.message}
								</p>
							)}
						</div>
					</CardContent>

					<CardFooter className="flex flex-col gap-2">
						<Button
							type="submit"
							className="w-full"
							disabled={!isValid || isAccepting}
						>
							{isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isAccepting ? "Creating Account..." : "Create Account"}
						</Button>
						<p className="text-xs text-muted-foreground text-center">
							By creating an account, you agree to our Terms of Service and Privacy
							Policy
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
