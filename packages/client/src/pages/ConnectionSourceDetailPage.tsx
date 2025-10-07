import { Globe, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ConnectionStatusCard } from "@/components/connection-sources/ConnectionStatusCard";
import {
	ConfluenceForm,
	ServiceNowForm,
	SharePointForm,
	WebSearchForm,
} from "@/components/connection-sources/connection-forms";
import Header from "@/components/Header";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	mapDataSourceToUI,
	SOURCE_METADATA,
	SOURCES,
} from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import { useDataSource } from "@/hooks/useDataSources";
import type { DataSourceConnection } from "@/types/dataSource";

export default function ConnectionSourceDetailPage() {
	const { id } = useParams<{ id: string }>(); // UUID from backend
	const navigate = useNavigate();
	const { data: source, isLoading, error } = useDataSource(id);
	const [isEditMode, setIsEditMode] = useState(false);

	if (isLoading) {
		return (
			<RitaSettingsLayout>
				<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
					<div className="text-center py-8">Loading connection...</div>
				</div>
			</RitaSettingsLayout>
		);
	}

	if (error || !source) {
		return <Navigate to="/404" replace />;
	}

	// Determine if source has been configured before
	// If last_verification_at is null, it has NEVER been configured
	const isConfigured = source.last_verification_at !== null;	

	const metadata = SOURCE_METADATA[source.type] || { title: source.type };
	const sourceTitle = metadata.title;

	// Map backend data to UI format for provider
	const uiSource = mapDataSourceToUI(source);

	// Render the appropriate form based on source type
	// Note: Forms will receive source via ConnectionSourceContext (useConnectionSource hook)
	const renderForm = (
		sourceData: DataSourceConnection,
		showCancel: boolean = false,
	) => {
		const handleCancel = showCancel
			? () => {
					if (!isConfigured) {
						navigate("/settings/connections");
					} else {
						setIsEditMode(false);
					}
				}
			: undefined;

		switch (sourceData.type) {
			case "confluence":
				return <ConfluenceForm onCancel={handleCancel} />;
			case "sharepoint":
				return <SharePointForm onCancel={handleCancel} />;
			case "servicenow":
				return <ServiceNowForm onCancel={handleCancel} />;
			case "websearch":
				return <WebSearchForm onCancel={handleCancel} />;
			default:
				return <div>Unknown source type</div>;
		}
	};

	// Render logic:
	// - NOT configured (lastVerificationAt === null):
	//   - Always show form by default with Cancel button
	// - IS configured (lastVerificationAt !== null):
	//   - Default: Show ConnectionStatusCard with Edit dropdown
	//   - After clicking Edit: Show form with Cancel button
	const renderContent = () => {
		if (!isConfigured) {
			// Never configured before → Show form directly with Cancel button
			return renderForm(source, true);
		}

		// Already configured → Show view mode or edit mode
		if (isEditMode) {
			// Edit mode → Show form with Cancel button
			return renderForm(source, true);
		}

		// Default: Show ConnectionStatusCard with Edit dropdown
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Connection Status</h2>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreVertical className="h-5 w-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setIsEditMode(true)}>
								Edit
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<ConnectionStatusCard source={uiSource} />
			</div>
		);
	};

	return (
		<ConnectionSourceProvider source={uiSource}>
			<RitaSettingsLayout>
				<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
					<div className="self-stretch flex flex-col items-start gap-8">
						<Header
							breadcrumbs={[
								{ label: "Connections", href: "/settings/connections" },
								{ label: sourceTitle },
							]}
							title={sourceTitle}
							icon={
								source.type !== SOURCES.WEB_SEARCH ? (
									<img
										src={`/connections/icon_${source.type}.svg`}
										alt={`${sourceTitle} icon`}
									/>
								) : (
									<Globe className="h-5 w-5 flex-shrink-0" />
								)
							}
							description={`Connect your ${sourceTitle} instance to build context for Rita to make better experiences.`}
						/>
					</div>

					{/* Content area - form or view mode */}
					<div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
						{renderContent()}
					</div>
				</div>
			</RitaSettingsLayout>
		</ConnectionSourceProvider>
	);
}
