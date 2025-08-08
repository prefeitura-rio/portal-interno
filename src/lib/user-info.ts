import { jwtDecode } from 'jwt-decode'
import { cookies } from 'next/headers'

export interface UserInfo {
  cpf: string
  name: string
  email: string
}

export async function getUserInfoFromToken(): Promise<
  UserInfo | { cpf: ''; name: ''; email: '' }
> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  if (!accessToken) return { cpf: '', name: '', email: '' }

  try {
    const decoded: any = jwtDecode(accessToken)
    const cpf = decoded.cpf || decoded.CPF || decoded.preferred_username
    const name = decoded.name || decoded.NOME || ''
    const email = decoded.email || decoded.EMAIL || ''
    if (!cpf || !name || !email) return { cpf: '', name: '', email: '' }
    return { cpf, name, email }
  } catch (e) {
    return { cpf: '', name: '', email: '' }
  }
}
