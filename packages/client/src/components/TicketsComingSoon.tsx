export default function TicketsComingSoon() {
	return (
		<div className="flex flex-col items-center gap-6 w-full max-w-[1120px] mx-auto">
			<h1 className="text-primary text-center text-[29px] font-[420] leading-7">
				Tickets coming soon
			</h1>

			<img
				src="/images/ticketcomingsoon.png"
				className="w-[338px] h-[231px] object-fill"
				alt="Tickets coming soon"
			/>

			<p className="text-center text-base font-normal leading-6 max-w-2xl">
				<p>Leverage your existing ITSM data for intelligent analysis.</p>
				<p className="text-muted-foreground">
					RITA enable historical tickets into quickly analyze patterns, improve
					responses, and strengthen automation for common L1/L2 tickets.
				</p>
			</p>
		</div>
	);
}
