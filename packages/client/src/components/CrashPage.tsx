/**
 * CrashPage - Reusable error/crash page component
 *
 * Based on v0.app design: https://v0.app/chat/b/b_t8qeGj6A1Fa
 * Adapted for RITA with:
 * - Removed Next.js dependencies (Image → img)
 * - Made configurable via props
 * - Added proper TypeScript types
 * - Added accessibility attributes
 */

import type React from "react"
import { Button } from "@/components/ui/button"

export interface CrashPageProps {
	/** Main heading/title of the error */
	title: string
	/** Descriptive message explaining the error */
	description: string
	/** Label for the action button */
	actionLabel: string
	/** Callback when action button is clicked */
	onAction: () => void
	/** Optional icon/image element to display (defaults to none) */
	icon?: React.ReactNode
	/** Optional custom icon/image URL */
	iconSrc?: string
	/** Optional alt text for icon image */
	iconAlt?: string
}

export function CrashPage({
	title,
	description,
	actionLabel,
	onAction,
	icon,
	iconSrc = "/images/img_error.png",
	iconAlt = "Error illustration",
}: CrashPageProps) {
	return (
		<div className="w-full h-screen bg-[rgb(5,7,15)] flex items-center justify-center">
			<div className="w-full max-w-[624px] flex flex-col items-center gap-6 p-6">
				{/* Icon/Image Section */}
				{(icon || iconSrc) && (
					<div className="w-full h-[300px] flex items-center justify-center">
						{icon || (
							<img
								src={iconSrc}
								alt={iconAlt}
								className="max-w-full h-auto max-h-[300px]"
							/>
						)}
					</div>
				)}

				{/* Title */}
				<h1 className="text-muted text-[29px] font-normal leading-7 text-center">
					{title}
				</h1>

				{/* Description */}
				<p className="text-card text-base font-light leading-6 text-center">
					{description}
				</p>

				{/* Action Button */}
				<Button onClick={onAction} aria-label={actionLabel}>
					{actionLabel}
				</Button>
			</div>
		</div>
	)
}

export default CrashPage
