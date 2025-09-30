import { useParams, Navigate } from 'react-router-dom';
import RitaSettingsLayout from '@/components/layouts/RitaSettingsLayout';
import { VALID_SOURCE_IDS } from '@/constants/connectionSources';

export default function ConnectionSourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>();

  // Redirect to 404 if source doesn't exist
  if (!sourceId || !VALID_SOURCE_IDS.includes(sourceId)) {
    return <Navigate to="/404" replace />;
  }

  // Format the source ID for display (e.g., "microsoft-sharepoint" -> "Microsoft Sharepoint")
  const formatSourceTitle = (id: string): string => {
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const sourceTitle = formatSourceTitle(sourceId);

  return (
    <RitaSettingsLayout>
      <div className="container mx-auto p-6 flex flex-col items-center gap-8">
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-medium text-foreground">Configure your {sourceTitle} connection</h3>
          <p className="text-sm text-muted-foreground">
          Connection configuration for {sourceTitle} will be implemented here.
          </p>
        </div>
      </div>
      </div>  
    </RitaSettingsLayout>
  );
}
