import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { useAuth } from "../hooks/useAuth";
import { validateEmail, validatePassword, validateRequired } from "../lib/validation";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function SignUpPage() {
	const { t } = useTranslation("auth");
	const navigate = useNavigate();
	const { authenticated, login, loading, sessionReady } = useAuth();
	const [signupForm, setSignupForm] = useState({
		firstName: "",
		lastName: "",
		email: "",
		company: "",
		password: "",
		acceptedTos: false,
	});
	const [signupLoading, setSignupLoading] = useState(false);
	const [signupError, setSignupError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		firstName?: string;
		lastName?: string;
		email?: string;
		company?: string;
		password?: string;
	}>({});
	const [dirtyFields, setDirtyFields] = useState<{
		firstName?: boolean;
		lastName?: boolean;
		email?: boolean;
		company?: boolean;
		password?: boolean;
	}>({});

	// Auto-redirect returning users to sign-in
	useEffect(() => {
		const key = "rita_returning_user";

		// Check localStorage and cookie
		const hasFlag =
			localStorage.getItem(key) === "true" ||
			document.cookie.includes(`${key}=true`);

		if (hasFlag) {
			// Clear flag to prevent redirect loop
			localStorage.removeItem(key);
			document.cookie = `${key}=; Max-Age=0; path=/; SameSite=Lax`;

			// Redirect to Keycloak sign-in
			login();
		}
	}, [login]);

	// Check if form is valid (all fields filled and pass validation)
	const isFormValid = (): boolean => {
		// Check if all fields are filled
		if (
			!signupForm.firstName.trim() ||
			!signupForm.lastName.trim() ||
			!signupForm.email.trim() ||
			!signupForm.company.trim() ||
			!signupForm.password ||
			!signupForm.acceptedTos
		) {
			return false;
		}

		// Check if all fields pass validation
		if (validateRequired(signupForm.firstName, "First name")) return false;
		if (validateRequired(signupForm.lastName, "Last name")) return false;
		if (validateEmail(signupForm.email)) return false;
		if (validateRequired(signupForm.company, "Company name")) return false;
		if (validatePassword(signupForm.password)) return false;

		return true;
	};

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		setSignupLoading(true);
		setSignupError(null);
		setFieldErrors({});

		// Mark all fields as dirty on submit
		setDirtyFields({
			firstName: true,
			lastName: true,
			email: true,
			company: true,
			password: true,
		});

		// Validate all fields using reusable validation utilities
		const errors: typeof fieldErrors = {};

		const firstNameError = validateRequired(signupForm.firstName, "First name");
		if (firstNameError) {
			errors.firstName = firstNameError;
		}

		const lastNameError = validateRequired(signupForm.lastName, "Last name");
		if (lastNameError) {
			errors.lastName = lastNameError;
		}

		const emailError = validateEmail(signupForm.email);
		if (emailError) {
			errors.email = emailError;
		}

		const companyError = validateRequired(signupForm.company, "Company name");
		if (companyError) {
			errors.company = companyError;
		}

		if (!signupForm.password) {
			errors.password = t("validation.passwordRequired");
		} else {
			const passwordError = validatePassword(signupForm.password);
			if (passwordError) {
				errors.password = passwordError;
			}
		}

		// If there are any errors, stop and display them
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			setSignupLoading(false);
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/auth/signup`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...signupForm,
					tosAcceptedAt: signupForm.acceptedTos ? new Date().toISOString() : undefined,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Signup failed");
			}

			// Redirect to verify email sent page with email in query params
			navigate(
				`/verify-email-sent?email=${encodeURIComponent(signupForm.email)}`,
			);
		} catch (error) {
			setSignupError(error instanceof Error ? error.message : "Signup failed");
		} finally {
			setSignupLoading(false);
		}
	};

	// Redirect if already logged in and session is ready
	if (authenticated && sessionReady && !loading) {
		return <Navigate to="/chat" replace />;
	}

	// Show a loading spinner while the auth state is being determined
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
				<div className="flex items-center gap-3 text-lg">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
					<span>{t("signup.loading")}</span>
				</div>
			</div>
		);
	}

	// If authenticated but session not ready, proceed anyway (temporary workaround)
	if (authenticated && !sessionReady) {
		return <Navigate to="/chat" replace />;
	}

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] text-white flex items-center justify-center p-4">
			<div className="w-full max-w-7xl lg:grid lg:grid-cols-2 gap-8 items-center">
				<div className="flex items-center justify-center p-6 sm:p-12">
					<div className="w-full max-w-md">
						<div className="text-left space-y-2 mb-8">
							<div className="flex justify-center mb-4">
								<img src="/signup-logo-rita.svg" alt="RITA Logo" className="h-28 w-28 object-contain" loading="lazy" />
							</div>
							<h1 className="text-4xl font-bold tracking-tighter">
								{t("signup.title")}
							</h1>
							<p className="text-muted-foreground">
								{t("signup.description")}
							</p>
						</div>

						{/* Signup Form */}
						<div className="space-y-4">
							{signupError && (
								<div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
									<p className="text-sm text-red-300">{signupError}</p>
								</div>
							)}

							<form onSubmit={handleSignup} className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<label htmlFor="firstName" className="text-gray-300">
											{t("signup.firstNameLabel")}
										</label>
										<Input
											id="firstName"
											type="text"
											placeholder="John"
											value={signupForm.firstName}
											onChange={(e) => {
												const value = e.target.value;
												setSignupForm((prev) => ({
													...prev,
													firstName: value,
												}));
												// Mark as dirty if value is not empty
												if (value.trim() !== "") {
													setDirtyFields((prev) => ({ ...prev, firstName: true }));
												}
												// Clear error when user types
												if (fieldErrors.firstName) {
													setFieldErrors((prev) => ({
														...prev,
														firstName: undefined,
													}));
												}
											}}
											onBlur={() => {
												// Only validate if field has been modified (is dirty)
												if (dirtyFields.firstName) {
													const error = validateRequired(signupForm.firstName, "First name");
													if (error) {
														setFieldErrors((prev) => ({ ...prev, firstName: error }));
													}
												}
											}}
											required
											disabled={signupLoading}
											className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
										/>
										{fieldErrors.firstName && (
											<p className="text-sm text-red-400">
												{fieldErrors.firstName}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<label htmlFor="lastName" className="text-gray-300">
											{t("signup.lastNameLabel")}
										</label>
										<Input
											id="lastName"
											type="text"
											placeholder="Doe"
											value={signupForm.lastName}
											onChange={(e) => {
												const value = e.target.value;
												setSignupForm((prev) => ({
													...prev,
													lastName: value,
												}));
												// Mark as dirty if value is not empty
												if (value.trim() !== "") {
													setDirtyFields((prev) => ({ ...prev, lastName: true }));
												}
												// Clear error when user types
												if (fieldErrors.lastName) {
													setFieldErrors((prev) => ({
														...prev,
														lastName: undefined,
													}));
												}
											}}
											onBlur={() => {
												// Only validate if field has been modified (is dirty)
												if (dirtyFields.lastName) {
													const error = validateRequired(signupForm.lastName, "Last name");
													if (error) {
														setFieldErrors((prev) => ({ ...prev, lastName: error }));
													}
												}
											}}
											required
											disabled={signupLoading}
											className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
										/>
										{fieldErrors.lastName && (
											<p className="text-sm text-red-400">
												{fieldErrors.lastName}
											</p>
										)}
									</div>
								</div>
								<div className="space-y-2">
									<label htmlFor="email" className="text-gray-300">
										{t("signup.emailLabel")}
									</label>
									<Input
										id="email"
										type="email"
										placeholder="you@acme.com"
										value={signupForm.email}
										onChange={(e) => {
											const value = e.target.value;
											setSignupForm((prev) => ({
												...prev,
												email: value,
											}));
											// Mark as dirty if value is not empty
											if (value.trim() !== "") {
												setDirtyFields((prev) => ({ ...prev, email: true }));
											}
											// Clear error when user types
											if (fieldErrors.email) {
												setFieldErrors((prev) => ({
													...prev,
													email: undefined,
												}));
											}
										}}
										onBlur={() => {
											// Only validate if field has been modified (is dirty)
											if (dirtyFields.email) {
												const error = validateEmail(signupForm.email);
												if (error) {
													setFieldErrors((prev) => ({ ...prev, email: error }));
												}
											}
										}}
										required
										disabled={signupLoading}
										className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
									/>
									{fieldErrors.email && (
										<p className="text-sm text-red-400">{fieldErrors.email}</p>
									)}
								</div>
								<div className="space-y-2">
									<label htmlFor="company" className="text-gray-300">
										{t("signup.companyLabel")}
									</label>
									<Input
										id="company"
										type="text"
										placeholder="Acme Inc."
										value={signupForm.company}
										onChange={(e) => {
											const value = e.target.value;
											setSignupForm((prev) => ({
												...prev,
												company: value,
											}));
											// Mark as dirty if value is not empty
											if (value.trim() !== "") {
												setDirtyFields((prev) => ({ ...prev, company: true }));
											}
											// Clear error when user types
											if (fieldErrors.company) {
												setFieldErrors((prev) => ({
													...prev,
													company: undefined,
												}));
											}
										}}
										onBlur={() => {
											// Only validate if field has been modified (is dirty)
											if (dirtyFields.company) {
												const error = validateRequired(signupForm.company, "Company name");
												if (error) {
													setFieldErrors((prev) => ({ ...prev, company: error }));
												}
											}
										}}
										required
										disabled={signupLoading}
										className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
									/>
									{fieldErrors.company && (
										<p className="text-sm text-red-400">{fieldErrors.company}</p>
									)}
								</div>
								<div className="space-y-2">
									<label htmlFor="password" className="text-gray-300">
										{t("signup.passwordLabel")}
									</label>
									<Input
										id="password"
										type="password"
										placeholder="••••••••"
										value={signupForm.password}
										onChange={(e) => {
											const value = e.target.value;
											setSignupForm((prev) => ({
												...prev,
												password: value,
											}));
											// Mark as dirty if value is not empty
											if (value !== "") {
												setDirtyFields((prev) => ({ ...prev, password: true }));
											}
											// Clear error when user types
											if (fieldErrors.password) {
												setFieldErrors((prev) => ({
													...prev,
													password: undefined,
												}));
											}
										}}
										onBlur={() => {
											// Only validate if field has been modified (is dirty)
											if (dirtyFields.password) {
												const error = validatePassword(signupForm.password);
												if (error) {
													setFieldErrors((prev) => ({ ...prev, password: error }));
												}
											}
										}}
										required
										disabled={signupLoading}
										className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
									/>
									{fieldErrors.password && (
										<p className="text-sm text-red-400">{fieldErrors.password}</p>
									)}
								</div>

								{/* Terms of Service Checkbox */}
								<div className="flex items-start gap-3">
									<Checkbox
										id="acceptedTos"
										checked={signupForm.acceptedTos}
										onCheckedChange={(checked) => {
											setSignupForm((prev) => ({
												...prev,
												acceptedTos: checked === true,
											}));
										}}
										disabled={signupLoading}
										className="mt-0.5"
									/>
									<label
										htmlFor="acceptedTos"
										className="text-sm text-gray-300 leading-relaxed cursor-pointer"
									>
										{t("signup.agreeToTerms")}{" "}
										<a
											href="/terms-of-service"
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-400 hover:underline font-medium"
											onClick={(e) => e.stopPropagation()}
										>
											{t("signup.termsOfService")}
										</a>
									</label>
								</div>

								<Button
									type="submit"
									disabled={signupLoading || !isFormValid()}
									className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
								>
									{signupLoading ? (
										<div className="flex items-center gap-2">
											<Loader2 className="h-5 w-5 animate-spin" />
											<span>{t("signup.creatingButton")}</span>
										</div>
									) : (
										<span>{t("signup.submitButton")}</span>
									)}
								</Button>
							</form>

							<div className="text-center space-y-3">
								<p className="text-sm text-muted-foreground">
									{t("signup.hasAccount")}{" "}
									<Button
										variant="link"
										onClick={() => login()}
										className="text-blue-400 hover:underline font-medium mt-0 p-0"
									>
										{t("signup.signInLink")}
									</Button>
								</p>
							</div>
						</div>
					</div>
				</div>
				<div className="hidden lg:flex items-center justify-center p-12 relative overflow-hidden">
					<img
						src="/ask-rita.png"
						alt="Ask RITA"
						className="object-contain w-auto h-[70%] rounded-2xl"
					/>
				</div>
			</div>
		</div>
	);
}
