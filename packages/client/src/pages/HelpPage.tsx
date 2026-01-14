import { useTranslation } from "react-i18next";

export default function HelpPage() {
	const { t } = useTranslation("common");

	return (
		<div className="flex items-center justify-center h-full">
			<div className="text-center">
				<h1 className="text-2xl font-semibold mb-2">{t("pages.help.title")}</h1>
				<p className="text-muted-foreground">{t("pages.help.comingSoon")}</p>
			</div>
		</div>
	);
}