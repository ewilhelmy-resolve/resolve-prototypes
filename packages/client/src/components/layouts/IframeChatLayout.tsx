/**
 * IframeChatLayout - Minimal layout for iframe-embedded chat
 *
 * Stripped-down version of RitaLayout with:
 * - No sidebar
 * - No header navigation
 * - No user profile UI
 * - Full-height chat container
 * - Minimal chrome for embedding
 */

import type { ReactNode } from "react";

export interface IframeChatLayoutProps {
	children: ReactNode;
}

export default function IframeChatLayout({ children }: IframeChatLayoutProps) {
	return (
		<div className="flex h-screen w-full overflow-hidden bg-background">
			<main className="relative flex-1 flex flex-col overflow-y-auto min-w-0 w-full">
				{children}
			</main>
		</div>
	);
}
