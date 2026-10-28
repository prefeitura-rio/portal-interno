import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // O middleware casa /api (RBAC) e o Next guarda o corpo da requisição em
    // memória até este limite (padrão 10MB). A importação de inscrições aceita
    // planilha de até 10MB em multipart; a folga evita corpo truncado.
    proxyClientMaxBodySize: '12mb',
  },
}

export default nextConfig
