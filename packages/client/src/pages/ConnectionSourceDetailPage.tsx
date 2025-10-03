import { Navigate, useParams } from "react-router-dom";
import {
	ConfluenceForm,
	ServiceNowForm,
	SharePointForm,
	WebSearchForm,
} from "@/components/connection-sources/connection-forms";
import Header from "@/components/Header";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import {
	getSourceById,
	SOURCE_IDS,
	SOURCES,
} from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";

export default function ConnectionSourceDetailPage() {
	const { sourceId } = useParams<{ sourceId: (typeof SOURCE_IDS)[number] }>();

	// Redirect to 404 if source doesn't exist
	if (!sourceId || !SOURCE_IDS.includes(sourceId)) {
		return <Navigate to="/404" replace />;
	}

	// Get source data by ID
	const source = getSourceById(sourceId);

	if (!source) {
		return <Navigate to="/404" replace />;
	}

	const sourceTitle = source.title;

	// Render the appropriate form based on source ID
	const renderForm = () => {
		switch (sourceId) {
			case SOURCES.CONFLUENCE:
				return <ConfluenceForm />;
			case SOURCES.SHAREPOINT:
				return <SharePointForm />;
			case SOURCES.SERVICENOW:
				return <ServiceNowForm />;
			case SOURCES.WEB_SEARCH:
				return <WebSearchForm />;
			default:
				return null;
		}
	};

	return (
		<ConnectionSourceProvider source={source}>
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
								source.id !== SOURCES.WEB_SEARCH ? (
									<img
										src={`/connections/icon_${sourceId}.svg`}
										alt={`${sourceTitle} icon`}
									/>
								) : undefined
							}
							description={`Connect your ${sourceTitle} instance to build context for Rita to make better experiences.`}
						/>
					</div>

					{/* Form area */}
					<div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
						{renderForm()}
					</div>
				</div>
			</RitaSettingsLayout>
		</ConnectionSourceProvider>
	);
}
