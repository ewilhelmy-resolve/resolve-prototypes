/**
 * PublicPageLayout - Layout for public pages without authentication
 *
 * Uses app styling but with:
 * - Header with RITA logo (no navigation)
 * - No sidebar
 * - Full-width content area
 * - Consistent background
 */

import { memo, type ReactNode } from "react";

export interface PublicPageLayoutProps {
	children: ReactNode;
}

// Logo component memoized to prevent re-renders
const RitaLogo = memo(() => (
	<div
		className="w-[179px] h-[18px] bg-no-repeat bg-center bg-contain"
		style={{ backgroundImage: "url('/logo-rita.svg')" }}
		role="img"
		aria-label="RITA Logo"
	/>
));
RitaLogo.displayName = "RitaLogo";

export default function PublicPageLayout({ children }: PublicPageLayoutProps) {
	return (
		<div className="flex flex-col min-h-screen w-full bg-background">
			{/* Header */}
			<header className="h-[67px] flex items-center px-6 border-b border-border bg-background flex-shrink-0">
				<RitaLogo />
			</header>

			{/* Content */}
			<main className="flex-1 overflow-y-auto">
				{children}
			</main>
		</div>
	);
}
