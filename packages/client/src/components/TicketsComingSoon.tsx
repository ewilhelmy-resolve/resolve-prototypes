import { useTranslation } from "react-i18next";

export default function TicketsComingSoon() {
	const { t } = useTranslation("tickets");

	return (
		<div className="flex flex-col items-center gap-6 w-full max-w-[1120px] mx-auto">

			<img
				src="/images/ticketcomingsoon.png"
				className="w-[338px] h-[231px] object-fill"
				alt={t("comingSoon.title")}
			/>

			<h1 className="text-primary text-center text-[29px] font-[420] leading-7">
				{t("comingSoon.title")}
			</h1>

			<div className="text-center text-base font-normal leading-6 max-w-2xl space-y-2">
				<p>{t("comingSoon.description")}</p>
				<p className="text-muted-foreground">
					{t("comingSoon.details")}
				</p>
			</div>
		</div>
	);
}
