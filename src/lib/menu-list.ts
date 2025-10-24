import {
  Briefcase,
  FolderKanban,
  GraduationCap,
  LayoutGrid,
  type LucideIcon,
  Settings,
} from 'lucide-react'

type Submenu = {
  href: string
  label: string
  active?: boolean
  allowedRoles?: string[]
}

type Menu = {
  href: string
  label: string
  active?: boolean
  icon: LucideIcon
  submenus?: Submenu[]
  allowedRoles?: string[]
}

type Group = {
  groupLabel: string
  menus: Menu[]
}

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: '',
      menus: [
        {
          href: '/',
          label: 'Dashboard',
          icon: LayoutGrid,
          submenus: [],
          allowedRoles: [
            'admin',
            'superadmin',
            'go:admin',
            'busca:services:admin',
            'busca:services:editor',
          ],
        },
      ],
    },
    {
      groupLabel: 'GO Rio',
      menus: [
        {
          href: '',
          label: 'Capacitação',
          icon: GraduationCap,
          allowedRoles: ['admin', 'superadmin', 'go:admin'],
          submenus: [
            {
              href: '/gorio/courses',
              label: 'Cursos',
              allowedRoles: ['admin', 'superadmin', 'go:admin'],
            },
            {
              href: '/gorio/courses/new',
              label: 'Novo Curso',
              allowedRoles: ['admin', 'superadmin', 'go:admin'],
            },
          ],
        },
        {
          href: '',
          label: 'Emprego e trabalho',
          icon: Briefcase,
          allowedRoles: ['admin', 'superadmin', 'go:admin'],
          submenus: [
            {
              href: '/gorio/jobs',
              label: 'Vagas',
              allowedRoles: ['admin', 'superadmin', 'go:admin'],
            },
            {
              href: '/gorio/jobs/new',
              label: 'Nova Vaga',
              allowedRoles: ['admin', 'superadmin', 'go:admin'],
            },
          ],
        },
      ],
    },
    {
      groupLabel: 'Serviços municipais',
      menus: [
        {
          href: '',
          label: 'Serviços municipais',
          icon: FolderKanban,
          allowedRoles: [
            'admin',
            'superadmin',
            'busca:services:admin',
            'busca:services:editor',
          ],
          submenus: [
            {
              href: '/servicos-municipais/servicos',
              label: 'Serviços',
              allowedRoles: [
                'admin',
                'superadmin',
                'busca:services:admin',
                'busca:services:editor',
              ],
            },
            {
              href: '/servicos-municipais/servicos/new',
              label: 'Novo Serviço',
              allowedRoles: [
                'admin',
                'superadmin',
                'busca:services:admin',
                'busca:services:editor',
              ],
            },
          ],
        },
      ],
    },
    {
      groupLabel: 'Configurações',
      menus: [
        // {
        //   href: '/users',
        //   label: 'Users',
        //   icon: Users,
        // },
        {
          href: '/account',
          label: 'Minha conta',
          icon: Settings,
          allowedRoles: [
            'admin',
            'superadmin',
            'go:admin',
            'busca:services:admin',
            'busca:services:editor',
          ],
        },
      ],
    },
  ]
}

/**
 * Filters menu items based on user roles from Heimdall
 * @param pathname - Current pathname
 * @param userRoles - Array of user's roles from Heimdall API
 * @returns Filtered menu list based on user permissions
 */
export function getFilteredMenuList(
  pathname: string,
  userRoles: string[] | null | undefined
): Group[] {
  if (!userRoles || userRoles.length === 0) return []

  const fullMenuList = getMenuList(pathname)

  return fullMenuList
    .map(group => ({
      ...group,
      menus: group.menus
        .filter(
          menu =>
            !menu.allowedRoles ||
            menu.allowedRoles.some(role => userRoles.includes(role))
        )
        .map(menu => ({
          ...menu,
          submenus:
            menu.submenus?.filter(
              submenu =>
                !submenu.allowedRoles ||
                submenu.allowedRoles.some(role => userRoles.includes(role))
            ) || [],
        }))
        .filter(
          menu =>
            menu.submenus === undefined ||
            menu.submenus.length > 0 ||
            menu.href !== ''
        ),
    }))
    .filter(group => group.menus.length > 0)
}
