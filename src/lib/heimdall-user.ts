import { getCurrentUserInfoApiV1UsersMeGet } from '@/http-heimdall/users/users'
import type { HeimdallUser } from '@/types/heimdall-roles'
import { cookies } from 'next/headers'
import { cache } from 'react'
import {
  HEIMDALL_USER_COOKIE_CONFIG,
  HEIMDALL_USER_COOKIE_NAME,
} from './auth-cookie-config'

async function fetchHeimdallUserFromApi(): Promise<HeimdallUser | null> {
  const response = await getCurrentUserInfoApiV1UsersMeGet()

  if (response.status !== 200) {
    console.error('Failed to fetch user info from Heimdall:', response.status)
    return null
  }

  const user: HeimdallUser = {
    id: response.data.id,
    cpf: response.data.cpf,
    display_name: response.data.display_name || undefined,
    groups: response.data.groups,
    roles: response.data.roles,
  }

  return user
}

export const getCurrentUserFromCacheOrHeimdall = cache(
  async (): Promise<HeimdallUser | null> => {
    const cookieStore = await cookies()
    const cached = cookieStore.get(HEIMDALL_USER_COOKIE_NAME)

    if (cached?.value) {
      try {
        const parsed = JSON.parse(cached.value) as HeimdallUser
        if (parsed && parsed.id && parsed.cpf) {
          return parsed
        }
      } catch {
        // ignore parse errors, will refetch
      }
    }

    const user = await fetchHeimdallUserFromApi()

    if (!user) {
      return null
    }

    try {
      const cookieStoreForSet = await cookies()
      cookieStoreForSet.set(
        HEIMDALL_USER_COOKIE_NAME,
        JSON.stringify(user),
        HEIMDALL_USER_COOKIE_CONFIG
      )
    } catch {
      // ignore cookie write errors
    }

    return user
  }
)

export async function getCurrentUserRoles(): Promise<string[] | undefined> {
  const user = await getCurrentUserFromCacheOrHeimdall()
  return user?.roles
}
