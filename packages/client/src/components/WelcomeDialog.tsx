/**
 * WelcomeDialog - Role-based welcome modal with visual mockup
 *
 * Displays personalized onboarding content based on user role:
 * - Admin/Owner: Steps to connect knowledge sources and invite teammates
 * - Regular User: Info about using RITAGo for IT support
 *
 * Features:
 * - Two-column layout (content left, visual mockup right)
 * - Role-based copy with personalized greeting
 * - Responsive design (stacks on mobile)
 *
 * Integrates with:
 * - useProfile() for user name and role detection
 * - useProfilePermissions() for role-based rendering
 * - Feature flag SHOW_WELCOME_MODAL for display control
 */

"use client";

import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useProfile, useProfilePermissions } from "@/hooks/api/useProfile";

interface WelcomeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function WelcomeDialog({
	open,
	onOpenChange,
}: WelcomeDialogProps) {
	const { t } = useTranslation("dialogs");
	const { data: profile } = useProfile();
	const { isOwnerOrAdmin } = useProfilePermissions();

	const firstName = profile?.user?.firstName || "there";
	const isAdmin = isOwnerOrAdmin();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-6xl p-4 sm:p-6 md:p-11">
				<div className="flex flex-col lg:flex-row gap-6 lg:gap-[90px] items-stretch w-full">
					{/* Left side - Content */}
					<div className="flex flex-col gap-4 sm:gap-6 items-start w-full lg:max-w-md">
						<div className="flex flex-col gap-2 items-start w-full">
							<h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal leading-tight text-foreground">
								{t("welcome.title", { name: firstName })}
							</h2>
							<p className="text-base sm:text-lg font-light leading-relaxed text-foreground">
								{t("welcome.subtitle")}
							</p>
						</div>

						<div className="flex flex-col gap-4 items-start w-full">
							{isAdmin ? (
								// Admin Copy
								<>
									<p className="text-base font-light leading-6 text-foreground">
										{t("welcome.admin.intro")}
									</p>
									<p className="text-base font-light leading-6 text-foreground">
										{t("welcome.admin.stepsIntro")}
									</p>
									<ul className="list-disc space-y-3 w-full pl-5">
										<li className="text-base font-light leading-6 text-foreground">
											{t("welcome.admin.step1")}
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											{t("welcome.admin.step2")}
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											{t("welcome.admin.step3")}
										</li>
									</ul>
								</>
							) : (
								// User Copy
								<>
									<h3 className="text-lg font-normal leading-7 text-foreground">
										{t("welcome.user.heading")}
									</h3>
									<p className="text-base font-light leading-6 text-foreground">
										{t("welcome.user.intro")}
									</p>
									<ul className="list-disc space-y-3 w-full pl-5">
										<li className="text-base font-light leading-6 text-foreground">
											{t("welcome.user.step1")}
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											{t("welcome.user.step2")}
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											{t("welcome.user.step3")}
										</li>
									</ul>
								</>
							)}

							<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-start pt-2 w-full">
								<Button
									onClick={() => onOpenChange(false)}
									className="w-full sm:w-auto"
								>
									{t("welcome.getStarted")}
								</Button>
								<Button
									variant="link"
									className="gap-2 w-full sm:w-auto justify-center sm:justify-start"
									onClick={() => {
										window.open(
                      // TODO: Update URL when RITA Go docs are live https://docs.resolve.com/ritago
                      // we use this old URL temporarily to avoid broken link
											"https://help.resolve.io/rita-go/",
											"_blank",
											"noopener,noreferrer",
										);
									}}
								>
									{t("welcome.learnMore")}
									<ExternalLink className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Right side - Visual mockup (desktop only) */}
					<div className="hidden lg:flex flex-col gap-2 items-center justify-center w-full lg:max-w-lg">
						<img
							src="/images/welcome-modal-mockup.png"
							alt="RITA Go chat interface showing password reset conversation"
							className="w-full h-full rounded-2xl object-cover"
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
