import { redirectToKeycloakLogin } from '@/lib/oauth-state'
import type { NextRequest } from 'next/server'

/**
 * Início do login: grava o cookie do `state` do OAuth e redireciona ao
 * endpoint de autorização do Keycloak (DEV-262). Toda ida ao login que parte
 * do navegador (botões de login, logout, dashboard sem CPF) passa por aqui,
 * porque um cookie httpOnly só pode ser gravado pelo servidor.
 */
export function GET(request: NextRequest) {
  return redirectToKeycloakLogin(request)
}
