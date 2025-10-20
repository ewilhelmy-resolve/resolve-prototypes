/**
 * ForgotPasswordPage - Public page for requesting password reset
 *
 * Allows users to enter their email to receive a password reset link.
 * Uses simulated submission for UI-only implementation.
 *
 * Route: /forgot-password
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

/**
 * Zod Schema for Forgot Password Form
 */
const forgotPasswordSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
	const navigate = useNavigate();
	const [isPending, setIsPending] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [submittedEmail, setSubmittedEmail] = useState("");
	const [isResending, setIsResending] = useState(false);

	// Form setup with react-hook-form + Zod
	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
	} = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(forgotPasswordSchema),
		mode: "onChange",
		defaultValues: {
			email: "",
		},
	});

	// Handle form submission (simulated)
	const onSubmit = (data: ForgotPasswordFormValues) => {
		// Simulate API call with setTimeout
		setIsPending(true);

		setTimeout(() => {
			setIsPending(false);
			setSubmittedEmail(data.email);
			setIsSuccess(true);
		}, 1500); // Simulate 1.5s network delay
	};

	// Handle resend (simulated)
	const handleResend = () => {
		setIsResending(true);

		setTimeout(() => {
			setIsResending(false);
			// Could show a toast here: "Email resent successfully"
		}, 1500); // Simulate 1.5s network delay
	};

	// Success state - Email sent confirmation
	if (isSuccess) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex justify-center items-center px-9">
				<div className="w-full max-w-md rounded-2xl p-4 flex flex-col justify-start items-center gap-6">
					<div className="w-full flex flex-col justify-start items-center gap-6 py-4">
						{/* Success Icon */}
						<div className="flex items-center gap-2">
							<Mail className="h-8 w-8 text-green-400" />
						</div>

						{/* Success Message */}
						<div className="w-full flex flex-col justify-start items-center">
							<h2 className="text-white text-3xl font-normal text-center leading-9 font-serif pb-2">
								Email on the way!
							</h2>
							<p className="text-white text-sm text-center leading-5">
								We sent you password reset instructions to{" "}
								<strong>{submittedEmail}</strong>. If it doesn't show up soon,
								check your spam folder.
							</p>
						</div>

						{/* Resend Link */}
						<div className="w-full text-center">
							<p className="text-sm text-white/70">
								Did not receive?{" "}
								<button
									type="button"
									onClick={handleResend}
									disabled={isResending}
									className="cursor-pointer hover:text-blue-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isResending ? "Resending..." : "Resend"}
								</button>
							</p>
						</div>

						{/* Back to Login Button */}
						<div className="w-full">
							<Button className="w-full" onClick={() => navigate("/login")}>
								Back to Login
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Main form for requesting password reset
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
									alt="RitaGo Logo"
									width="24"
									height="24"
								/>
							</div>
						</div>

						{/* Header */}
						<div className="w-full flex flex-col justify-start items-center">
							<div className="w-full flex justify-center items-center pb-2">
								<h2 className="text-white text-3xl font-normal text-center leading-9 font-serif">
									Forgot your password?
								</h2>
							</div>
							<div className="w-full flex justify-center items-center">
								<p className="text-white text-sm text-center leading-5">
									Enter your work email address and we'll send you a link to
									reset your password.
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
									Sending reset link...
								</p>
							</div>
						)}

						{/* Email Input */}
						<div className="w-full space-y-2">
							<Label htmlFor="email" className="text-white text-sm">
								Work Email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@company.com"
								{...register("email")}
								disabled={isPending}
								className="text-white placeholder:text-gray-400"
							/>
							{errors.email && (
								<p className="text-sm text-red-400">{errors.email.message}</p>
							)}
						</div>

						{/* Submit Button */}
						<div className="w-full">
							<Button
								type="submit"
								className="w-full"
								disabled={!isValid || isPending}
							>
								{isPending ? "Sending..." : "Send Reset Link"}
							</Button>
						</div>

						{/* Back to Login Link */}
						<div className="w-full text-center">
							<Link
								to="/login"
								className="text-sm text-blue-400 hover:text-blue-300 underline"
							>
								Back to login
							</Link>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
