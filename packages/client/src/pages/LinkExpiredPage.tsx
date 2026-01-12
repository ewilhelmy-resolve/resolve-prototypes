/**
 * LinkExpiredPage - Public page for expired/invalid magic links
 *
 * Uses the same dark gradient background as the login page.
 * Displays appropriate message based on reason (expired, not_found).
 *
 * Route: /link-expired?reason=expired|not_found
 */

import { Clock, XCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

type InvalidReason = "expired" | "not_found";

/**
 * Get icon, title and message based on reason
 */
function getContentForReason(reason: InvalidReason) {
	switch (reason) {
		case "expired":
			return {
				icon: Clock,
				iconBg: "bg-yellow-500/20",
				iconColor: "text-yellow-400",
				title: "Link Expired",
				message:
					"This credential setup link has expired. Please contact the organization owner to request a new link.",
			};
		default:
			return {
				icon: XCircle,
				iconBg: "bg-red-500/20",
				iconColor: "text-red-400",
				title: "Invalid Link",
				message:
					"This link is invalid or no longer exists. Please contact the organization owner to request a new credential setup link.",
			};
	}
}

export default function LinkExpiredPage() {
	const [searchParams] = useSearchParams();
	const reason = (searchParams.get("reason") as InvalidReason) || "not_found";

	const { title, message } = getContentForReason(reason);

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] text-white flex items-center justify-center p-4">
			<div className="w-full max-w-md text-center">
				{/* Logo */}
				<div className="flex justify-center mb-8">
					<img
						src="/signup-logo-rita.svg"
						alt="RITA Logo"
						className="h-20 w-20 object-contain"
					/>
				</div>

				{/* Title */}
				<h1 className="text-3xl font-bold tracking-tight mb-4">{title}</h1>

				{/* Message */}
				<p className="text-gray-400 text-lg leading-relaxed mb-8">{message}</p>

				{/* Help text */}
				<div className="p-4 bg-white/5 border border-white/10 rounded-lg">
					<p className="text-sm text-gray-400">
						Need help? Contact your RitaGO Admin

					</p>
				</div>
			</div>
		</div>
	);
}
