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
								Welcome to RITA Go, {firstName}
							</h2>
							<p className="text-base sm:text-lg font-light leading-relaxed text-foreground">
								Enjoy your free 90-day trial of Resolve's AI-powered agent for
								faster, smarter IT support.
							</p>
						</div>

						<div className="flex flex-col gap-4 items-start w-full">
							{isAdmin ? (
								// Admin Copy
								<>
									<p className="text-base font-light leading-6 text-foreground">
									    RITA Go learns from your company's knowledge and tickets
										(coming soon) to help resolve IT issues automatically.
									</p>
									<p className="text-base font-light leading-6 text-foreground">
										In a few steps, you'll:
									</p>
									<ul className="list-disc space-y-3 w-full pl-5">
										<li className="text-base font-light leading-6 text-foreground">
											Connect your knowledge sources like Confluence,
											ServiceNow, or SharePoint.
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											Invite your teammates to start getting instant answers.
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											And coming soon — connect your ITSM for historical
											ticket data to enrich your workspace and help users
											resolve issues even faster.
										</li>
									</ul>
								</>
							) : (
								// User Copy
								<>
									<h3 className="text-lg font-normal leading-7 text-foreground">
										Your Admin has connected your workspace.
									</h3>
									<p className="text-base font-light leading-6 text-foreground">
										RITA Go helps you solve IT issues instantly — from password
										resets to VPN access — all based on your company's trusted
										content. Just ask a question or describe the issue, and
										RITA Go will:
									</p>
									<ul className="list-disc space-y-3 w-full pl-5">
										<li className="text-base font-light leading-6 text-foreground">
											Search verified knowledge
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											Get easy next steps or fixes to issues, fast
										</li>
										<li className="text-base font-light leading-6 text-foreground">
											Create a ticket if you still need help without overhead
										</li>
									</ul>
								</>
							)}

							<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-start pt-2 w-full">
								<Button
									onClick={() => onOpenChange(false)}
									className="w-full sm:w-auto"
								>
									Get Started
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
									Learn how RITA Go works
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
