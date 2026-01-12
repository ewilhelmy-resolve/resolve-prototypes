import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function VerifyEmailPage() {
	const { t } = useTranslation("auth");
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { login } = useAuth();
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);

	const [message, setMessage] = useState<string>("");
	const [userEmail, setUserEmail] = useState<string>("");

	useEffect(() => {
		const token = searchParams.get("token");

		if (!token) {
			setStatus("error");
			setMessage(t("verifyEmail.noToken"));
			return;
		}

		const verifyEmail = async () => {
			try {
				const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token }),
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Verification failed");
				}

				setStatus("success");
				setMessage(data.message);
				setUserEmail(data.email);
			} catch (error) {
				setStatus("error");
				setMessage(
					error instanceof Error ? error.message : "Verification failed",
				);
			}
		};

		verifyEmail();
	}, [searchParams, t]);

	const handleSignIn = () => {
		login(); // Direct redirect to Keycloak
	};

	const handleRetrySignup = () => {
		navigate("/login"); // Back to signup page
	};

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] text-white flex items-center justify-center p-4">
			<div className="w-full max-w-lg">
				<div className="p-6 sm:p-12">
					<div className="w-full">
						<div className="text-center space-y-2 mb-8">
							{status === "success" && (
								<Badge variant="default" className="px-3 text-sm mb-7">
									{t("verifyEmail.badge")}
								</Badge>
							)}
							<h1 className="text-4xl font-bold tracking-tighter">
								{status !== "success" && t("verifyEmail.title")}
								{status === "success" && t("verifyEmail.successTitle")}
							</h1>
							<p className="text-muted-foreground">
								{status === "loading" && t("verifyEmail.verifying")}
								{status === "error" && t("verifyEmail.errorMessage")}
							</p>
						</div>

						{/* Content */}
						<div className="space-y-4">
							{/* Loading State */}
							{status === "loading" && (
								<div className="flex items-center justify-center py-8">
									<div className="flex items-center gap-3 text-lg">
										<Loader2 className="h-6 w-6 animate-spin text-blue-400" />
										<span className="text-muted-foreground">
											{t("verifyEmail.verifyingShort")}
										</span>
									</div>
								</div>
							)}

							{/* Success State */}
							{status === "success" && (
								<div className="space-y-6">
									<div className="flex flex-col items-center space-y-4">
										<div className="text-center space-y-6 mb-4">
											<p className="text-sm text-muted-foreground">
												{t("verifyEmail.successInfo", { email: userEmail })}
											</p>
										</div>
									</div>

									<Button
										onClick={handleSignIn}
										className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
									>
										<div className="flex items-center gap-2">
											<span>{t("verifyEmail.continueSignIn")}</span>
										</div>
									</Button>
								</div>
							)}

							{/* Error State */}
							{status === "error" && (
								<div className="space-y-6">
									<div className="flex flex-col items-center space-y-4">
										<div className="text-center">
											<p className="text-sm text-red-300 bg-red-900/20 border border-red-700 rounded-lg p-4">
												{message}
											</p>
										</div>
									</div>

									<div className="space-y-3">
										<Button
											onClick={handleRetrySignup}
											className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
										>
											<div className="flex items-center gap-2">
												<span>{t("verifyEmail.tryAgain")}</span>
											</div>
										</Button>

										<Button
											onClick={handleSignIn}
											variant="link"
											className="w-full h-12 text-blue-400 font-medium"
										>
											{t("verifyEmail.signIn")}
										</Button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
