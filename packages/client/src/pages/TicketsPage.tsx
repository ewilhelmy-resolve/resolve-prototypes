/**
 * TicketsPage - Tickets feature coming soon page
 *
 * Displays a placeholder page for the upcoming Tickets feature.
 * Only accessible to owner and admin roles.
 */

import RitaLayout from "@/components/layouts/RitaLayout";
import TicketsComingSoon from "@/components/TicketsComingSoon";

export default function TicketsPage() {
	return (
		<RitaLayout activePage="tickets">
			<div className="flex flex-col items-center justify-center h-full p-6">
				<TicketsComingSoon />
			</div>
		</RitaLayout>
	);
}
