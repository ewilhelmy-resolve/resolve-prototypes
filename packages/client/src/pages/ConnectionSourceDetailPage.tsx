import { Globe } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
 import ConfluenceConfiguration from "@/components/connection-sources/connection-details/ConfluenceConfiguration";
import ServiceNowConfiguration from "@/components/connection-sources/connection-details/ServiceNowConfiguration";
import SharePointConfiguration from "@/components/connection-sources/connection-details/SharePointConfiguration";
import WebSearchConfiguration from "@/components/connection-sources/connection-details/WebSearchConfiguration";
import {
	ConfluenceForm,
	ServiceNowForm,
	SharePointForm,
	WebSearchForm,
} from "@/components/connection-sources/connection-forms";
import Header from "@/components/Header";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import {
	mapDataSourceToUI,
	SOURCE_METADATA,
	SOURCES,
} from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import { useDataSource } from "@/hooks/useDataSources";
import { BACKEND_STATUS, type DataSourceConnection } from "@/types/dataSource";

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
	// OR if status is 'verifying' (backend is processing first-time verification)
	const isConfigured =
		source.last_verification_at !== null ||
		source.status === BACKEND_STATUS.FAILED ||
		source.status === BACKEND_STATUS.COMPLETED ||
		source.status === BACKEND_STATUS.VERIFYING ||
		source.status === BACKEND_STATUS.SYNCING;

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

	// Render the appropriate configuration view based on source type
	const renderConfiguration = (sourceData: DataSourceConnection) => {
		const handleEdit = () => setIsEditMode(true);

		switch (sourceData.type) {
			case "confluence":
				return <ConfluenceConfiguration onEdit={handleEdit} />;
			case "sharepoint":
				return <SharePointConfiguration onEdit={handleEdit} />;
			case "servicenow":
				return <ServiceNowConfiguration onEdit={handleEdit} />;
			case "websearch":
				return <WebSearchConfiguration onEdit={handleEdit} />;
			default:
				return <div>Unknown source type</div>;
		}
	};

	// Render logic:
	// - Show FORM when: NOT configured OR isEditMode is true
	// - Show CONFIGURATION VIEW otherwise
	const renderContent = () => {

		// Show form if not configured OR in edit mode
		if (!isConfigured || isEditMode) {
			return renderForm(source, true);
		}

		// Default: Show configuration view (ConfluenceConfiguration, etc.)
		return renderConfiguration(source);
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
