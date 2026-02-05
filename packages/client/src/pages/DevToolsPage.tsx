/**
 * DevToolsPage - Developer tools and settings
 *
 * Provides access to feature flags and other developer utilities.
 * Uses RitaV1Layout with top nav and left sidebar, but no right panel.
 */

import { FeatureFlagsPanel } from '@/components/devtools/FeatureFlagsPanel'
import RitaLayout from '@/components/layouts/RitaLayout'

const DevToolsPage: React.FC = () => {
  return (
    <RitaLayout activePage="users">
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Developer Tools</h1>
            <p className="text-sm text-muted-foreground">
              Manage feature flags and developer settings
            </p>
          </div>

          {/* Feature Flags Panel */}
          <FeatureFlagsPanel />
        </div>
      </div>
    </RitaLayout>
  )
}

export default DevToolsPage
