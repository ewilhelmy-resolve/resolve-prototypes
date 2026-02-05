import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "../components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function VerifyEmailSentPage() {
	const { t } = useTranslation("auth");
	const [searchParams] = useSearchParams();
	const email = searchParams.get("email") || "";
	const [isResending, setIsResending] = useState(false);
	const [resendMessage, setResendMessage] = useState<string | null>(null);
	const [resendError, setResendError] = useState<string | null>(null);

	const handleResendVerification = async () => {
		if (!email) {
			setResendError(t("verifyEmailSent.emailRequired"));
			return;
		}

		setIsResending(true);
		setResendError(null);
		setResendMessage(null);

		try {
			const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || t("verifyEmailSent.resendFailed"));
			}

			setResendMessage(t("verifyEmailSent.resendSuccess"));
		} catch (error) {
			setResendError(
				error instanceof Error
					? error.message
					: t("verifyEmailSent.resendFailed"),
			);
		} finally {
			setIsResending(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] px-4">
			<div className="flex flex-col items-center text-center space-y-6 w-full">
				{/* Success Badge */}
				<Badge variant="default" className="px-3 text-sm mb-7">
					{t("verifyEmailSent.badge")}
				</Badge>

				{/* Main Heading */}
				<h1 className="text-4xl md:text-5xl font-light text-white leading-tight">
					{t("verifyEmailSent.title")}
				</h1>

				{/* Email Display */}
				{email && (
					<p className="text-gray-400">
						{t("verifyEmailSent.sentTo")}{" "}
						<span className="text-white font-medium">{email}</span>
					</p>
				)}

				{/* Success/Error Messages */}
				{resendMessage && (
					<div className="w-full p-4 bg-green-900/20 border border-green-700 rounded-lg">
						<p className="text-sm text-green-300">{resendMessage}</p>
					</div>
				)}

				{resendError && (
					<div className="w-full p-4 bg-red-900/20 border border-red-700 rounded-lg">
						<p className="text-sm text-red-300">{resendError}</p>
					</div>
				)}

				{/* Resend Verification */}
				<div className="flex items-center gap-2 text-sm">
					<span className="text-white">{t("verifyEmailSent.didNotReceive")}</span>
					<Button
						onClick={handleResendVerification}
						disabled={isResending || !email}
						variant="link"
						className="text-blue-500 hover:text-blue-400 p-0 h-auto transition-colors disabled:opacity-50"
					>
						{isResending ? (
							<span className="flex items-center gap-1">
								<Loader2 className="h-3 w-3 animate-spin" />
								{t("verifyEmailSent.sending")}
							</span>
						) : (
							t("verifyEmailSent.resend")
						)}
					</Button>
				</div>

				{/* Back to Login */}
				<div className="pt-4">
					<a
						href="/"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						{t("verifyEmailSent.backToLogin")}
					</a>
				</div>
			</div>
		</div>
	);
}
