import { useEffect } from 'react'
import { useProfile } from '@/hooks/api/useProfile'
import { useFeatureFlagsStore } from '@/stores/feature-flags-store'

/**
 * Hook to initialize platform feature flags
 *
 * @returns Loading and initialization state
 */
export function usePlatformFlagsInit() {
  const { data: profile } = useProfile()
  const { initialize, initialized, loading } = useFeatureFlagsStore()

  useEffect(() => {
    if (profile?.organization.id && !initialized && !loading) {
      initialize(profile.organization.id)
    }
  }, [profile?.organization.id, initialized, loading, initialize])

  return { initialized, loading }
}
