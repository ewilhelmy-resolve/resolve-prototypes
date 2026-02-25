import { ProHeader } from "./ProHeader";

interface ProLayoutProps {
	children: React.ReactNode;
}

export function ProLayout({ children }: ProLayoutProps) {
	return (
		<div className="flex min-h-screen flex-col">
			<ProHeader />
			<main className="flex-1 overflow-y-auto">{children}</main>
		</div>
	);
}
