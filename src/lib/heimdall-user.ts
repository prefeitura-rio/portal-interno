import { getCurrentUserInfoApiV1UsersMeGet } from '@/http-heimdall/users/users'
import type { HeimdallUser } from '@/types/heimdall-roles'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { resolveHeimdallUser } from './heimdall-user-cache'

const ACCESS_TOKEN_COOKIE_NAME = 'access_token'

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

/**
 * Usuário do Heimdall da sessão atual, do cache do servidor ou do Heimdall.
 * Nunca lê o cookie `heimdall_user`, que o cliente controla: a chave do cache
 * é o próprio `access_token` da sessão.
 */
export const getCurrentUserFromCacheOrHeimdall = cache(
  async (): Promise<HeimdallUser | null> => {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value

    if (!accessToken) {
      return null
    }

    return resolveHeimdallUser(accessToken, fetchHeimdallUserFromApi)
  }
)

export async function getCurrentUserRoles(): Promise<string[] | undefined> {
  const user = await getCurrentUserFromCacheOrHeimdall()
  return user?.roles
}
