import { getCurrentUserInfoApiV1UsersMeGet } from '@/http-heimdall/users/users'

/**
 * Fetches user roles from Heimdall API
 * This is a server-side function used by middleware
 *
 * @returns Array of user roles or null if failed
 */
export async function getUserRolesFromHeimdall(): Promise<string[] | null> {
  try {
    const response = await getCurrentUserInfoApiV1UsersMeGet()

    if (response.status === 200 && response.data) {
      return response.data.roles || []
    }

    return null
  } catch (error) {
    console.error('Error fetching user roles from Heimdall:', error)
    return null
  }
}
