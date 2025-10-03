/**
 * FeatureFlagsPanel - Feature flags management UI
 *
 * Provides a UI for viewing and toggling all feature flags.
 * Organized by category with descriptions and reset functionality.
 */

import { Settings, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { FEATURE_FLAGS, type FeatureFlagKey } from '@/types/featureFlags'
import { toast } from 'sonner'

export function FeatureFlagsPanel() {
  const { flags, setFlag, resetAll, hasModifiedFlags } = useFeatureFlags()

  // Group flags by category
  const categories = {
    general: [] as FeatureFlagKey[],
    debug: [] as FeatureFlagKey[],
    experimental: [] as FeatureFlagKey[],
  }

  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    const config = FEATURE_FLAGS[key]
    categories[config.category].push(key)
  }

  const handleReset = () => {
    resetAll()
    toast.success('All feature flags reset to defaults')
  }

  const handleToggle = (key: FeatureFlagKey, checked: boolean) => {
    setFlag(key, checked)
    const action = checked ? 'enabled' : 'disabled'
    toast.success(`${FEATURE_FLAGS[key].label} ${action}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Feature Flags</h2>
            <p className="text-sm text-muted-foreground">
              Control application features via localStorage
            </p>
          </div>
        </div>
        {hasModifiedFlags() && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All
          </Button>
        )}
      </div>

      {/* General Features */}
      {categories.general.length > 0 && (
        <Card className="p-6">
          <h3 className="font-medium mb-4">General Features</h3>
          <div className="space-y-4">
            {categories.general.map((key) => {
              const config = FEATURE_FLAGS[key]
              return (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {config.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={flags[key]}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Debug Features */}
      {categories.debug.length > 0 && (
        <Card className="p-6">
          <h3 className="font-medium mb-4">Debug Features</h3>
          <div className="space-y-4">
            {categories.debug.map((key) => {
              const config = FEATURE_FLAGS[key]
              return (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {config.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={flags[key]}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Experimental Features */}
      {categories.experimental.length > 0 && (
        <Card className="p-6 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
          <h3 className="font-medium mb-4 text-amber-900 dark:text-amber-100">
            Experimental Features
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
            These features are in early development and may be unstable.
          </p>
          <Separator className="my-4" />
          <div className="space-y-4">
            {categories.experimental.map((key) => {
              const config = FEATURE_FLAGS[key]
              return (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {config.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={flags[key]}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-4 bg-muted/50">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Feature flags are stored in localStorage and persist across browser
          sessions. Changes take effect immediately without requiring a page refresh.
        </p>
      </Card>
    </div>
  )
}
