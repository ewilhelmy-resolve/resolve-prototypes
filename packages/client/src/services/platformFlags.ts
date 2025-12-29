/**
 * Platform Feature Flags Service
 *
 * Fetches feature flags via api-server relay proxy.
 * Environment is determined by NODE_ENV on the server.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Fetch a single platform flag via api-server relay
 */
export async function fetchPlatformFlag(
  clientKey: string,
  _tenantId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feature-flags/${clientKey}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`Platform flag fetch failed for ${clientKey}: ${response.status}`)
      return false
    }

    const data = await response.json()
    return data.isEnabled ?? false
  } catch (error) {
    console.warn(`Platform flag fetch error for ${clientKey}:`, error)
    return false
  }
}

/**
 * Fetch all platform flags via batch endpoint
 */
export async function fetchAllPlatformFlags(
  flagNames: string[],
  _tenantId: string
): Promise<Record<string, boolean>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feature-flags/batch`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ flagNames }),
    })

    if (!response.ok) {
      console.warn(`Batch platform flag fetch failed: ${response.status}`)
      return flagNames.reduce((acc, name) => ({ ...acc, [name]: false }), {})
    }

    const data = await response.json()
    return data.flags ?? {}
  } catch (error) {
    console.warn('Batch platform flag fetch error:', error)
    return flagNames.reduce((acc, name) => ({ ...acc, [name]: false }), {})
  }
}

/**
 * Update a platform flag via api-server relay
 */
export async function updatePlatformFlag(
  clientKey: string,
  _tenantId: string,
  isEnabled: boolean
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feature-flags/${clientKey}/rules`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isEnabled }),
    })

    if (!response.ok) {
      console.warn(`Platform flag update failed for ${clientKey}: ${response.status}`)
      return false
    }

    return true
  } catch (error) {
    console.warn(`Platform flag update error for ${clientKey}:`, error)
    return false
  }
}
