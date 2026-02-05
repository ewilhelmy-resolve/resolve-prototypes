"use client";

import { Globe } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CrashPage } from "@/components/CrashPage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
	mapDataSourceToUI,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { useDataSources, useSeedDataSources } from "@/hooks/useDataSources";
import { ConnectionStatusBadge } from "../../components/connection-sources/ConnectionStatusBadge";
import { Button } from "../../components/ui/button";
import SettingsHeader from "./SettingsHeader";

export default function ConnectionSources() {
	const { t } = useTranslation("settings");
	const { mutate: seedSources, isPending: isSeeding } = useSeedDataSources();
	const { data: dataSources, isLoading, error } = useDataSources();

	// Seed on mount (idempotent - safe to call multiple times)
	useEffect(() => {
		seedSources();
	}, [seedSources]);

	// Map backend data to UI format and sort in specified order
	const uiSources = useMemo(() => {
		if (!dataSources) return [];

		// Define the desired order
		const sourceOrder = ["confluence", "sharepoint", "servicenow", "jira", "websearch"];

		// Map and sort data sources
		const mapped = dataSources.map(mapDataSourceToUI);
		return mapped.sort((a, b) => {
			const indexA = sourceOrder.indexOf(a.type);
			const indexB = sourceOrder.indexOf(b.type);
			return indexA - indexB;
		});
	}, [dataSources]);

	if (isLoading || isSeeding) {
		return (
			<div className="w-full">
				<div className="flex flex-col gap-8">
					<SettingsHeader
						title={t("connectionSources.title")}
						description={t("connectionSources.description")}
					/>
					<div className=" max-w-6xl">
						<div className="text-center py-8">{t("connectionSources.loading")}</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<CrashPage
				title={t("errors.loadDataSourcesFailed")}
				description={t("errors.loadDataSourcesDescription")}
				actionLabel={t("errors.tryAgain")}
				onAction={() => window.location.reload()}
			/>
		);
	}

	return (
		<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
			<div className="self-stretch flex flex-col items-start gap-8">
				<SettingsHeader
					title={t("connectionSources.title")}
					description={t("connectionSources.description")}
				/>
			</div>

			<div className="px-6 pb-8 max-w-2xl mx-auto w-full">
				{uiSources.map((source) => {
					const cardContent = (
						<Card
							className={`p-4 mb-5 border border-border bg-popover transition-colors ${source.type === SOURCES.CONFLUENCE ? "hover:bg-accent cursor-pointer" : "cursor-default opacity-75"}`}
						>
							<div className="flex justify-between items-center">
								<div className="flex flex-col gap-2">
									<div className="flex flex-col">
										<div className="flex items-center gap-2">
											{source.type !== SOURCES.WEB_SEARCH ? (
												<img
													src={`/connections/icon_${source.type}.svg`}
													alt={`${source.title} icon`}
													className="w-5 h-5 flex-shrink-0"
												/>
											) : (
												<Globe className="h-5 w-5 flex-shrink-0" />
											)}
											<p className="text-base font-bold text-foreground">
												{source.title}
											</p>
											<ConnectionStatusBadge status={source.status} />
										</div>

										{source.lastSync && (
											<p className="text-sm text-foreground mt-1">
												{t("connectionSources.lastSync", { time: source.lastSync })}
											</p>
										)}
										{source.description && (
											<p className="text-sm text-foreground mt-1">
												{source.description}
											</p>
										)}
									</div>
									<div className="flex gap-2 flex-wrap">
										{source.badges.map((badge) => (
											<Badge key={badge} variant="secondary">
												{badge}
											</Badge>
										))}
									</div>
								</div>
								<Button
									variant="secondary"
									size="sm"
									disabled={source.type !== SOURCES.CONFLUENCE}
								>
									{source.type === SOURCES.CONFLUENCE && (
										<span>
											{source.status === STATUS.NOT_CONNECTED
												? t("connectionSources.configure")
												: t("connectionSources.manage")}
										</span>
									)}

									{source.type !== SOURCES.CONFLUENCE && (
										<span>{t("connectionSources.comingSoon")}</span>
									)}
								</Button>
							</div>
						</Card>
					);

					// Only wrap Confluence sources with Link
					if (source.type === SOURCES.CONFLUENCE) {
						return (
							<Link
								key={source.id}
								to={`/settings/connections/${source.id}`}
								className="block"
							>
								{cardContent}
							</Link>
						);
					}

				// For other sources, just return the card without link
				return <div key={source.id}>{cardContent}</div>;
			})}
			</div>
		</div>
	);
}
