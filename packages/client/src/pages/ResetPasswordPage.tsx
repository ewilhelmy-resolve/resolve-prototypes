/**
 * @deprecated This page is for UI reference only and is NOT used in production.
 *
 * Password reset is handled by Keycloak's native forgot password flow:
 * - User clicks "Forgot Password?" on Keycloak login page
 * - Keycloak renders `login-reset-password.ftl` (RITA themed)
 * - Keycloak sends email and handles password update
 * - See: keycloak/themes/rita-theme-v2/login/login-reset-password.ftl
 *
 * This React component is kept as a design reference for potential future
 * Keycloak theme customizations or RITA Go admin features.
 *
 * ---
 *
 * ResetPasswordPage - Public page for resetting password with token
 *
 * Allows users to reset their password using a token from the reset email.
 * Uses simulated token verification and submission for UI-only implementation.
 *
 * Route: /reset-password?token=<reset_token>
 * For testing: Use token=valid-token to see the form
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

/**
 * Zod Schema for Reset Password Form
 * Enforces password complexity requirements
 */
const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
			.regex(/[a-z]/, "Password must contain at least one lowercase letter")
			.regex(/[0-9]/, "Password must contain at least one number"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const navigate = useNavigate();

	const [isVerifying, setIsVerifying] = useState(true);
	const [tokenValid, setTokenValid] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [countdown, setCountdown] = useState(3);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// Form setup with react-hook-form + Zod
	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
	} = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
		mode: "onChange",
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	// Simulate token verification on mount
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVerifying(false);
			// For UI testing: accept "valid-token" as valid token
			setTokenValid(token === "valid-token");
		}, 1000); // Simulate 1s verification delay

		return () => clearTimeout(timer);
	}, [token]);

	// Handle countdown and redirect after success
	useEffect(() => {
		if (isSuccess) {
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						navigate("/login");
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [isSuccess, navigate]);

	// Handle form submission (simulated)
	const onSubmit = (_data: ResetPasswordFormValues) => {
		// Simulate API call with setTimeout
		// Note: data parameter not used in simulated submission
		setIsPending(true);

		setTimeout(() => {
			setIsPending(false);
			setIsSuccess(true);
		}, 1500); // Simulate 1.5s network delay
	};

	// Loading state - Verifying token
	if (isVerifying) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
				<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-center items-center gap-6">
					<Loader2 className="h-8 w-8 animate-spin text-white" />
					<p className="text-white text-sm">Verifying reset link...</p>
				</div>
			</div>
		);
	}

	// Error state - Invalid or expired token
	if (!tokenValid) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
				<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-start items-center gap-6">
					<div className="w-full flex flex-col justify-start items-center gap-6 py-4">
						{/* Error Icon */}
						<div className="flex items-center gap-2">
							<AlertCircle className="h-8 w-8 text-red-400" />
						</div>

						{/* Error Message */}
						<div className="w-full flex flex-col justify-start items-center">
							<h2 className="text-white text-3xl font-normal text-center leading-9 font-serif pb-2">
								Invalid or expired reset link
							</h2>
							<p className="text-white text-sm text-center leading-5">
								This password reset link is invalid or has expired. Please
								request a new one.
							</p>
						</div>

						{/* Request New Link Button */}
						<div className="w-full">
							<Button
								className="w-full"
								onClick={() => navigate("/forgot-password")}
							>
								Request New Link
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Success state - Password reset complete
	if (isSuccess) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
				<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-start items-center gap-6">
					<div className="w-full flex flex-col justify-start items-center gap-6 py-4">
						{/* Success Icon */}
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-8 w-8 text-green-400" />
						</div>

						{/* Success Message */}
						<div className="w-full flex flex-col justify-start items-center">
							<h2 className="text-white text-3xl font-normal text-center leading-9 font-serif pb-2">
								Success!
							</h2>
							<p className="text-white text-sm text-center leading-5 mb-4">
								Your password has been updated and is secure. You can now log in
								again.
							</p>
							<p className="text-white/70 text-sm text-center leading-5">
								Redirecting to login in {countdown} seconds...
							</p>
						</div>

						{/* Go to Login Button */}
						<div className="w-full">
							<Button className="w-full" onClick={() => navigate("/login")}>
								Go to Login Now
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Main form for resetting password
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
									Reset your password
								</h2>
							</div>
							<div className="w-full flex justify-center items-center">
								<p className="text-white text-sm text-center leading-5">
									Almost done. Enter your new password and you're good to go.
								</p>
							</div>
						</div>
					</div>

					{/* Form Fields */}
					<div className="w-full flex flex-col justify-center items-center gap-5">
						{/* Progress Bar (shown during submission) */}
						{isPending && (
							<div className="w-full space-y-2">
								<Progress value={undefined} className="w-full" />
								<p className="text-white text-sm text-center">
									Resetting password...
								</p>
							</div>
						)}

						{/* New Password */}
						<div className="w-full space-y-2">
							<Label htmlFor="password" className="text-white text-sm">
								New Password
							</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="••••••••"
									{...register("password")}
									disabled={isPending}
									className="text-white placeholder:text-gray-400 pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							{errors.password && (
								<p className="text-sm text-red-400">{errors.password.message}</p>
							)}
						</div>

						{/* Confirm Password */}
						<div className="w-full space-y-2">
							<Label htmlFor="confirmPassword" className="text-white text-sm">
								Confirm Password
							</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={showConfirmPassword ? "text" : "password"}
									placeholder="••••••••"
									{...register("confirmPassword")}
									disabled={isPending}
									className="text-white placeholder:text-gray-400 pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
								>
									{showConfirmPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							{errors.confirmPassword && (
								<p className="text-sm text-red-400">
									{errors.confirmPassword.message}
								</p>
							)}
						</div>

						{/* Submit Button */}
						<div className="w-full">
							<Button
								type="submit"
								className="w-full"
								disabled={!isValid || isPending}
							>
								{isPending ? "Resetting..." : "Reset Password"}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
