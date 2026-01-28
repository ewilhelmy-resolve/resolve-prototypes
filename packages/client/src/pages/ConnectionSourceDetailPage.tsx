import { Globe } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ConfluenceConfiguration from "@/components/connection-sources/connection-details/ConfluenceConfiguration";
import FreshdeskItsmConfiguration from "@/components/connection-sources/connection-details/FreshdeskItsmConfiguration";
import JiraItsmConfiguration from "@/components/connection-sources/connection-details/JiraItsmConfiguration";
import ServiceNowItsmConfiguration from "@/components/connection-sources/connection-details/ServiceNowItsmConfiguration";
import ServiceNowKBConfiguration from "@/components/connection-sources/connection-details/ServiceNowKBConfiguration";
import SharePointConfiguration from "@/components/connection-sources/connection-details/SharePointConfiguration";
import WebSearchConfiguration from "@/components/connection-sources/connection-details/WebSearchConfiguration";
import {
	ConfluenceForm,
	FreshdeskForm,
	JiraForm,
	ServiceNowForm,
	SharePointForm,
	WebSearchForm,
} from "@/components/connection-sources/connection-forms";
import DelegationInviteBox from "@/components/connection-sources/DelegationInviteBox.tsx";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import { Separator } from "@/components/ui/separator";
import {
	mapDataSourceToUI,
	SOURCE_METADATA,
	SOURCES,
} from "@/constants/connectionSources";
import { ConnectionSourceProvider } from "@/contexts/ConnectionSourceContext";
import type { ItsmSystemType } from "@/hooks/api/useCredentialDelegations.ts";
import { useDataSource } from "@/hooks/useDataSources";
import SettingsHeader from "@/pages/settings/SettingsHeader";
import { BACKEND_STATUS, type DataSourceConnection } from "@/types/dataSource";

type ConnectionMode = "knowledge" | "itsm";

// Registry for connection source forms (same for both modes)
const FORM_REGISTRY: Record<
	string,
	React.ComponentType<{
		onCancel?: () => void;
		onSuccess?: () => void;
		onFailure?: () => void;
	}>
> = {
	[SOURCES.CONFLUENCE]: ConfluenceForm,
	[SOURCES.SHAREPOINT]: SharePointForm,
	[SOURCES.SERVICENOW]: ServiceNowForm,
	[SOURCES.SERVICENOW_ITSM]: ServiceNowForm,
	[SOURCES.WEB_SEARCH]: WebSearchForm,
	[SOURCES.JIRA_ITSM]: JiraForm,
	[SOURCES.FRESHDESK]: FreshdeskForm,
	[SOURCES.JIRA_ITSM]: JiraForm,
};

// Registry for Knowledge Sources configuration views
const KB_CONFIGURATION_REGISTRY: Record<
	string,
	React.ComponentType<{ onEdit: () => void }>
> = {
	[SOURCES.CONFLUENCE]: ConfluenceConfiguration,
	[SOURCES.SHAREPOINT]: SharePointConfiguration,
	[SOURCES.SERVICENOW]: ServiceNowKBConfiguration,
	[SOURCES.WEB_SEARCH]: WebSearchConfiguration,
};

// Registry for ITSM Sources configuration views
const ITSM_CONFIGURATION_REGISTRY: Record<
	string,
	React.ComponentType<{ onEdit: () => void }>
> = {
	[SOURCES.SERVICENOW_ITSM]: ServiceNowItsmConfiguration,
	[SOURCES.JIRA_ITSM]: JiraItsmConfiguration,
	[SOURCES.FRESHDESK]: FreshdeskItsmConfiguration,
};

interface ConnectionSourceDetailPageProps {
	mode: ConnectionMode;
}

export default function ConnectionSourceDetailPage({
	mode,
}: ConnectionSourceDetailPageProps) {
	const { t } = useTranslation("connections");
	const { id } = useParams<{ id: string }>(); // UUID from backend
	const navigate = useNavigate();
	const { data: source, isLoading, error } = useDataSource(id);
	const [isEditMode, setIsEditMode] = useState(false);

	if (isLoading) {
		return (
			<RitaSettingsLayout>
				<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
					<div className="text-center py-8">{t("detail.loading")}</div>
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

	// Get the base path for navigation based on mode
	const basePath =
		mode === "knowledge"
			? "/settings/connections/knowledge"
			: "/settings/connections/itsm";

	// Get breadcrumb label based on mode
	const breadcrumbLabel =
		mode === "knowledge"
			? t("detail.breadcrumbs.knowledgeSources")
			: t("detail.breadcrumbs.itsmSources");

	// Get configuration registry based on mode
	const configurationRegistry =
		mode === "knowledge"
			? KB_CONFIGURATION_REGISTRY
			: ITSM_CONFIGURATION_REGISTRY;

	// Render the appropriate form based on source type
	// Note: Forms will receive source via ConnectionSourceContext (useConnectionSource hook)
	const renderForm = (
		sourceData: DataSourceConnection,
		showCancel: boolean = false,
	) => {
		const handleCancel = showCancel
			? () => {
					if (!isConfigured) {
						navigate(basePath);
					} else {
						setIsEditMode(false);
					}
				}
			: undefined;

		const handleSuccess = () => {
			setIsEditMode(false);
		};

		const handleFailure = () => {
			setIsEditMode(false);
		};

		const FormComponent = FORM_REGISTRY[sourceData.type];

		if (!FormComponent) {
			return <div>{t("detail.unknownSourceType")}</div>;
		}

		return (
			<FormComponent
				onCancel={handleCancel}
				onSuccess={handleSuccess}
				onFailure={handleFailure}
			/>
		);
	};

	// Render the appropriate configuration view based on source type and mode
	const renderConfiguration = (sourceData: DataSourceConnection) => {
		const handleEdit = () => setIsEditMode(true);

		const ConfigurationComponent = configurationRegistry[sourceData.type];

		if (!ConfigurationComponent) {
			return <div>{t("detail.configurationNotAvailable")}</div>;
		}

		return <ConfigurationComponent onEdit={handleEdit} />;
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
						<SettingsHeader
							breadcrumbs={[
								{ label: breadcrumbLabel, href: basePath },
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
							description={t("detail.connectDescription", {
								source: sourceTitle,
							})}
						/>

						{mode === "itsm" && (!isConfigured || isEditMode) && (
							<DelegationInviteBox itsmSource={source.type as ItsmSystemType} />
						)}
						<Separator orientation="horizontal" />
					</div>

					{/* Content area - form or view mode */}
					<div className="w-full max-w-2xl mx-auto flex flex-col gap-8 px-4 md:px-0">
						{renderContent()}
					</div>
				</div>
			</RitaSettingsLayout>
		</ConnectionSourceProvider>
	);
}
