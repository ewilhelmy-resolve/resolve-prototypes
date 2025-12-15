const PLATFORM_FLAGS_URL = import.meta.env.VITE_PLATFORM_FLAGS_URL || 'https://strangler-facade.resolve.io'

/**
 * Derive platform environment from current URL
 * - rita.resolve.io → production
 * - onboarding.resolve.io → staging
 * - localhost → development
 */
function getPlatformEnv(): string {
  if (typeof window === 'undefined') return 'development'

  const hostname = window.location.hostname

  if (hostname.includes('rita.resolve.io')) {
    return 'production'
  }
  if (hostname.includes('onboarding.resolve.io')) {
    return 'staging'
  }
  // localhost or any other
  return 'development'
}

const PLATFORM_ENV = getPlatformEnv()

export { PLATFORM_ENV }

const CLIENT_TO_PLATFORM_FLAG_MAP: Record<string, string> = {
  'ENABLE_AUTO_PILOT': 'auto-pilot',
  'ENABLE_AUTO_PILOT_SUGGESTIONS': 'auto-pilot-suggestions',
  'ENABLE_AUTO_PILOT_ACTIONS': 'auto-pilot-actions',
}

function getPlatformFlagName(clientKey: string): string {
  return CLIENT_TO_PLATFORM_FLAG_MAP[clientKey] || clientKey
}

export async function fetchPlatformFlag(
  clientKey: string,
  tenantId: string
): Promise<boolean> {
  if (!PLATFORM_FLAGS_URL) {
    console.warn('Platform flags URL not configured, using default values')
    return false
  }

  const platformName = getPlatformFlagName(clientKey)

  try {
    const response = await fetch(
      `${PLATFORM_FLAGS_URL}/api/features/is-enabled/${platformName}/${PLATFORM_ENV}/${tenantId}`
    )

    if (!response.ok) {
      console.warn(`Platform flag fetch failed for ${clientKey} (${platformName}): ${response.status}`)
      return false
    }

    return await response.json()
  } catch (error) {
    console.warn(`Platform flag fetch error for ${clientKey} (${platformName}):`, error)
    return false
  }
}

/**
 * Fetch all platform flags in parallel
 *
 * @param flagNames - Array of feature flag identifiers
 * @param tenantId - Organization/tenant ID
 * @returns Record of flag names to boolean values
 */
export async function fetchAllPlatformFlags(
  flagNames: string[],
  tenantId: string
): Promise<Record<string, boolean>> {
  const results = await Promise.allSettled(
    flagNames.map(async (name) => ({
      name,
      value: await fetchPlatformFlag(name, tenantId)
    }))
  )

  return results.reduce((acc, result) => {
    if (result.status === 'fulfilled') {
      acc[result.value.name] = result.value.value
    }
    return acc
  }, {} as Record<string, boolean>)
}

export async function updatePlatformFlag(
  clientKey: string,
  tenantId: string,
  isEnabled: boolean
): Promise<boolean> {
  if (!PLATFORM_FLAGS_URL) {
    console.warn('Platform flags URL not configured')
    return false
  }

  const platformName = getPlatformFlagName(clientKey)

  try {
    const response = await fetch(
      `${PLATFORM_FLAGS_URL}/api/features/${platformName}/rules`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment: PLATFORM_ENV,
          tenant: tenantId,
          isEnabled,
        }),
      }
    )

    if (!response.ok) {
      console.warn(`Platform flag update failed for ${clientKey} (${platformName}): ${response.status}`)
      return false
    }

    return true
  } catch (error) {
    console.warn(`Platform flag update error for ${clientKey} (${platformName}):`, error)
    return false
  }
}
