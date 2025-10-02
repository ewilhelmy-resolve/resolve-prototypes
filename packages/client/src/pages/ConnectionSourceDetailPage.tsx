import { Link, Navigate, useParams } from "react-router-dom";
import {
	ConfluenceForm,
	ServiceNowForm,
	SharePointForm,
	WebSearchForm,
} from "@/components/connection-forms";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import { ConnectionStatusBadge } from "@/components/settings/ConnectionStatusBadge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	getSourceById,
	SOURCE_IDS,
	SOURCES,
} from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";

export default function ConnectionSourceDetailPage() {
	const { sourceId } = useParams<{ sourceId: typeof SOURCE_IDS[number] }>();

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
					{/* Top block */}
					<div className="self-stretch flex flex-col items-start gap-8">
						{/* Breadcrumbs */}
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<Link to="/settings/connections">Connections</Link>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<span>{sourceTitle}</span>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
						{/* Title row */}
						<div className="self-stretch inline-flex items-center gap-2">
							<div className="flex flex-1 items-center gap-3">
								{source.id !== SOURCES.WEB_SEARCH && (
									<img
										src={`/connections/icon_${sourceId}.svg`}
										alt={`${sourceTitle} icon`}
										className="w-5 h-5 flex-shrink-0 self-center"
									/>
								)}
								<h1 className="text-2xl leading-8 tracking-[-0.01em] text-foreground flex items-center">
									{sourceTitle}
								</h1>
								<ConnectionStatusBadge status={source.status} />
							</div>
						</div>

						<p className="self-stretch text-sm leading-5 text-muted-foreground">
							Connect your {sourceTitle} instance to build context for Rita to
							make better experiences.
						</p>

						<hr className="self-stretch border-t border-border" />
					</div>

					{/* Form area */}
					<div className="w-full max-w-2xl flex flex-col items-center gap-8">
						{renderForm()}
					</div>
				</div>
			</RitaSettingsLayout>
		</ConnectionSourceProvider>
	);
}
