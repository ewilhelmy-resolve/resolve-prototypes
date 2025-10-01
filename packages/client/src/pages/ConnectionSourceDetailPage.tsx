import { useParams, Navigate, Link } from 'react-router-dom';
import RitaSettingsLayout from '@/components/layouts/RitaSettingsLayout';
import { VALID_SOURCE_IDS, getSourceById } from '@/constants/connectionSources';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ConnectionStatusBadge } from '@/components/ConnectionStatusBadge';
import { Button } from '@/components/ui/button';
import { ConfluenceForm, SharePointForm, ServiceNowForm, WebSearchForm } from '@/components/connection-forms';

export default function ConnectionSourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>();

  // Redirect to 404 if source doesn't exist
  if (!sourceId || !VALID_SOURCE_IDS.includes(sourceId)) {
    return <Navigate to="/404" replace />;
  }

  // Get source data by ID
  const source = getSourceById(sourceId);

  if (!source) {
    return <Navigate to="/404" replace />;
  }

  const sourceTitle = source.title;

  // Handle form submission
  const handleFormSubmit = (data: any) => {
    console.log('Form submitted:', data);
    // TODO: Implement API call to save connection
  };

  // Render the appropriate form based on source ID
  const renderForm = () => {
    switch (sourceId) {
      case 'confluence':
        return <ConfluenceForm onSubmit={handleFormSubmit} />;
      case 'sharepoint':
        return <SharePointForm onSubmit={handleFormSubmit} />;
      case 'servicenow':
        return <ServiceNowForm onSubmit={handleFormSubmit} />;
      case 'web-search':
        return <WebSearchForm onSubmit={handleFormSubmit} />;
      default:
        return null;
    }
  };

  return (
    <RitaSettingsLayout>
      <div className="flex-1 inline-flex flex-col items-start gap-8  w-full">
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
            <div className="flex flex-1 items-center gap-2">
              <h1 className="text-2xl leading-8 tracking-[-0.01em] text-foreground">
                {sourceTitle}
              </h1>
              <ConnectionStatusBadge status={source.status} />
            </div>
         
            <Button size="sm" type="submit" form="connection-form">
              Connect
            </Button>
          </div>

          <p className="self-stretch text-sm leading-5 text-muted-foreground">
            Connect your {sourceTitle} instance to build context for Rita to make better experiences.
          </p>

          <hr className="self-stretch border-t border-border" />
        </div>

        {/* Form area */}
        <div className="self-stretch flex flex-col items-start gap-2">
          <div className="w-full max-w-[520px] flex flex-col items-start gap-8">
            {renderForm()}
          </div>
        </div>
      </div>
    </RitaSettingsLayout>
  );
}
