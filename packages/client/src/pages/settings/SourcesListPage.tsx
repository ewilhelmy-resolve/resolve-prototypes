"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { CrashPage } from "@/components/CrashPage";
import { SourceListCard } from "@/components/connection-sources/SourceListCard";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import {
	mapDataSourceToUI,
	SOURCE_METADATA,
	STATUS,
	sortSourcesByStatus,
} from "@/constants/connectionSources";
import { useDataSources, useSeedDataSources } from "@/hooks/useDataSources";
import SettingsHeader from "./SettingsHeader";

interface SourcesListPageProps {
	title: string;
	description: string;
	loadingText: string;
	errorTitle: string;
	errorDescription: string;
	errorAction: string;
	configureLabel: string;
	manageLabel: string;
	comingSoonLabel: string;
	lastSyncLabel: string;
	sourcesOrder: string[];
	enabledSources: string[];
	basePath: string;
	/** Whether to create placeholder entries for missing source types */
	createPlaceholders?: boolean;
	/** Content rendered before the card list (e.g. training banner) */
	headerContent?: ReactNode;
	/** Custom icon override per source type */
	iconOverrides?: Record<string, ReactNode>;
}

export default function SourcesListPage({
	title,
	description,
	loadingText,
	errorTitle,
	errorDescription,
	errorAction,
	configureLabel,
	manageLabel,
	comingSoonLabel,
	lastSyncLabel,
	sourcesOrder,
	enabledSources,
	basePath,
	createPlaceholders = false,
	headerContent,
	iconOverrides,
}: SourcesListPageProps) {
	const { mutate: seedSources, isPending: isSeeding } = useSeedDataSources();
	const { data: dataSources, isLoading, error } = useDataSources();

	useEffect(() => {
		seedSources();
	}, [seedSources]);

	const uiSources = useMemo(() => {
		if (!dataSources) return [];

		const existingSources = dataSources
			.filter((ds) => sourcesOrder.includes(ds.type))
			.map(mapDataSourceToUI);

		if (!createPlaceholders) {
			return sortSourcesByStatus(existingSources, sourcesOrder);
		}

		const existingTypes = existingSources.map((s) => s.type);
		const placeholders = sourcesOrder
			.filter((type) => !existingTypes.includes(type))
			.map((type) => ({
				id: `placeholder-${type}`,
				type,
				title: SOURCE_METADATA[type]?.title || type,
				status: STATUS.NOT_CONNECTED,
				description: SOURCE_METADATA[type]?.description,
				badges: [] as string[],
				lastSync: undefined as string | undefined,
			}));

		return sortSourcesByStatus(
			[...existingSources, ...placeholders],
			sourcesOrder,
		);
	}, [dataSources, sourcesOrder, createPlaceholders]);

	if (isLoading || isSeeding) {
		return (
			<RitaSettingsLayout>
				<div className="w-full">
					<div className="flex flex-col gap-8">
						<SettingsHeader title={title} description={description} />
						<div className="max-w-6xl">
							<div className="text-center py-8">{loadingText}</div>
						</div>
					</div>
				</div>
			</RitaSettingsLayout>
		);
	}

	if (error) {
		return (
			<RitaSettingsLayout>
				<CrashPage
					title={errorTitle}
					description={errorDescription}
					actionLabel={errorAction}
					onAction={() => window.location.reload()}
				/>
			</RitaSettingsLayout>
		);
	}

	return (
		<RitaSettingsLayout>
			<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
				<div className="self-stretch flex flex-col items-start gap-8">
					<SettingsHeader title={title} description={description} />
				</div>

				<div className="px-6 pb-8 max-w-2xl mx-auto w-full">
					{headerContent}
					{uiSources.map((source) => {
						const isEnabled = enabledSources.includes(source.type);
						const isPlaceholder = source.id.startsWith("placeholder-");

						const cardContent = (
							<SourceListCard
								source={source}
								isEnabled={isEnabled}
								isPlaceholder={isPlaceholder}
								actionLabel={
									source.status === STATUS.NOT_CONNECTED
										? configureLabel
										: manageLabel
								}
								disabledLabel={comingSoonLabel}
								lastSyncLabel={lastSyncLabel}
								icon={iconOverrides?.[source.type]}
							/>
						);

						if (isEnabled && !isPlaceholder) {
							return (
								<Link
									key={source.id}
									to={`${basePath}/${source.id}`}
									className="block mb-5"
								>
									{cardContent}
								</Link>
							);
						}

						return (
							<div key={source.id} className="mb-5">
								{cardContent}
							</div>
						);
					})}
				</div>
			</div>
		</RitaSettingsLayout>
	);
}
