/**
 * DevToolsPage - Developer tools and settings
 *
 * Provides access to feature flags and other developer utilities.
 * Uses RitaV1Layout with top nav and left sidebar, but no right panel.
 */

import { FeatureFlagsPanel } from '@/components/devtools/FeatureFlagsPanel'
import RitaV1Layout from '@/components/layouts/RitaV1Layout'

const DevToolsPage: React.FC = () => {
  return (
    <RitaV1Layout activePage="users">
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
    </RitaV1Layout>
  )
}

export default DevToolsPage
