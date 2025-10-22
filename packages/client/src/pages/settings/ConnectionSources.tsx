"use client";

import { Globe } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CrashPage } from "@/components/CrashPage";
import {
	mapDataSourceToUI,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { useDataSources, useSeedDataSources } from "@/hooks/useDataSources";
import { ConnectionStatusBadge } from "../../components/connection-sources/ConnectionStatusBadge";
import Header from "../../components/Header";
import { Button } from "../../components/ui/button";

export default function ConnectionSources() {
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
		const sourceOrder = ["confluence", "sharepoint", "servicenow", "websearch"];

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
					<Header
						title="Connection Sources"
						description="Connect your knowledge and ticketing sources to help Rita resolve IT issues faster."
					/>
					<div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
						<div className="text-center py-8">Loading connections...</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<CrashPage
				title="Failed to load data sources"
				description="An error occurred while fetching connection sources. Please try again."
				actionLabel="Try Again"
				onAction={() => window.location.reload()}
			/>
		);
	}

	return (
		<div className="w-full">
			<div className="flex flex-col gap-8">
				<Header
					title="Connection Sources"
					description="Connect your knowledge and ticketing sources to help Rita resolve IT issues faster."
				/>
				<div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
					{uiSources.map((source) => (
						<Link
							key={source.id}
							to={`/settings/connections/${source.id}`}
							className="block"
						>
							<Card className="p-4 border border-border bg-popover hover:bg-accent transition-colors cursor-pointer">
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
													Last sync: {source.lastSync}
												</p>
											)}
											{source.description && (
												<p className="text-sm text-foreground mt-1">
													{source.description}
												</p>
											)}
										</div>
										<div className="flex gap-2">
											{source.badges.map((badge) => (
												<Badge key={badge} variant="secondary">
													{badge}
												</Badge>
											))}
										</div>
									</div>
									<Button variant="secondary" size="sm">
										{source.status === STATUS.NOT_CONNECTED
											? "Configure"
											: "Manage"}
									</Button>
								</div>
							</Card>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
