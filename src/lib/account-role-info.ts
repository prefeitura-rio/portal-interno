/**
 * Rótulo, descrição e cor de cada papel do Heimdall exibidos em Minha Conta
 * (`/account`): "Funções Ativas" e "Descrição das Funções".
 *
 * Papel fora do mapa aparece com o próprio slug e a descrição genérica
 * "Função personalizada" (DEV-613: os papéis do módulo Cursos caíam aqui).
 */
export type RoleInfo = {
  label: string
  description: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
  className: string
}

export const ROLE_INFO: Readonly<Record<string, RoleInfo>> = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total a todos os módulos e configurações',
    variant: 'default',
    className: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  superadmin: {
    label: 'Super Administrador',
    description: 'Acesso irrestrito a toda a plataforma',
    variant: 'default',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
  'go:admin': {
    label: 'Administrador GO Rio',
    description: 'Gerencia cursos, vagas e capacitações do GO Rio',
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'go:cursos:casa_civil': {
    label: 'Curadoria de Cursos (Casa Civil)',
    description: 'Aprova, publica e rejeita cursos de todas as secretarias',
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'go:cursos:editor': {
    label: 'Editor Cursos',
    description:
      'Cria e edita cursos da sua secretaria e os envia para aprovação',
    variant: 'outline',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  'busca:services:admin': {
    label: 'Administrador de Serviços',
    description: 'Gerencia e aprova serviços municipais',
    variant: 'secondary',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  'busca:services:editor': {
    label: 'Editor de Serviços',
    description: 'Cria e edita serviços municipais',
    variant: 'outline',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  'go:empregabilidade:admin': {
    label: 'Administrador Emprego e Trabalho',
    description: 'Acesso ao módulo Emprego e trabalho',
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'go:empregabilidade:editor_sem_curadoria': {
    label: 'Editor Emprego e Trabalho (sem curadoria)',
    description: 'Edição no módulo Emprego e trabalho',
    variant: 'outline',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  'go:empregabilidade:editor_com_curadoria': {
    label: 'Editor Emprego e Trabalho (com curadoria)',
    description: 'Edição com curadoria no módulo Emprego e trabalho',
    variant: 'outline',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  'go:curriculos:admin': {
    label: 'Admin Banco de Currículos',
    description: 'Consulta ao banco de currículos',
    variant: 'outline',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  'go:curriculos:editor': {
    label: 'Editor Banco de Currículos',
    description: 'Consulta ao banco de currículos',
    variant: 'outline',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
}

export function getRoleInfo(role: string): RoleInfo {
  if (Object.hasOwn(ROLE_INFO, role)) {
    return ROLE_INFO[role]
  }
  return {
    label: role,
    description: 'Função personalizada',
    variant: 'outline',
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  }
}
