import {
  Briefcase,
  FolderKanban,
  GraduationCap,
  LayoutGrid,
  type LucideIcon,
  Settings,
} from 'lucide-react'

export type Submenu = {
  href: string
  label: string
  active?: boolean
  allowedRoles?: string[]
}

export type SubmenuGroup = {
  label: string
  submenus: Submenu[]
  allowedRoles?: string[]
}

export type MenuItem = Submenu | SubmenuGroup

function isSubmenuGroup(item: MenuItem): item is SubmenuGroup {
  return 'submenus' in item && !('href' in item)
}

type Menu = {
  href: string
  label: string
  active?: boolean
  icon: LucideIcon
  submenus?: MenuItem[]
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
              label: 'MEI',
              allowedRoles: ['admin', 'superadmin', 'go:admin'],
              submenus: [
                {
                  href: '/gorio/oportunidades-mei',
                  label: 'Oportunidades MEI',
                  allowedRoles: ['admin', 'superadmin', 'go:admin'],
                },
                {
                  href: '/gorio/oportunidades-mei/new',
                  label: 'Nova oportunidade MEI',
                  allowedRoles: ['admin', 'superadmin', 'go:admin'],
                },
              ],
            },
            {
              label: 'Empregabilidade',
              allowedRoles: ['admin', 'superadmin', 'go:admin'],
              submenus: [
                {
                  href: '/gorio/empregabilidade',
                  label: 'Vagas',
                  allowedRoles: ['admin', 'superadmin', 'go:admin'],
                },
                {
                  href: '/gorio/empregabilidade/new',
                  label: 'Nova vaga',
                  allowedRoles: ['admin', 'superadmin', 'go:admin'],
                },
              ],
            },
          ],
        },
      ].filter(menu => {
        // TEMPORARY: Hide "Emprego e trabalho" menu when feature flag is enabled
        // TODO: Remove this filter once the feature is ready
        if (
          menu.label === 'Emprego e trabalho' &&
          process.env.NEXT_PUBLIC_FEATURE_FLAG === 'true'
        ) {
          return false
        }
        return true
      }),
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
            menu.submenus
              ?.map(item => {
                if (isSubmenuGroup(item)) {
                  // Filter submenus within the group
                  const filteredSubmenus = item.submenus.filter(
                    submenu =>
                      !submenu.allowedRoles ||
                      submenu.allowedRoles.some(role =>
                        userRoles.includes(role)
                      )
                  )
                  // Only include the group if it has submenus and user has permission
                  if (
                    filteredSubmenus.length > 0 &&
                    (!item.allowedRoles ||
                      item.allowedRoles.some(role => userRoles.includes(role)))
                  ) {
                    return { ...item, submenus: filteredSubmenus }
                  }
                  return null
                }
                // Regular submenu - filter by role
                if (
                  !item.allowedRoles ||
                  item.allowedRoles.some(role => userRoles.includes(role))
                ) {
                  return item
                }
                return null
              })
              .filter((item): item is MenuItem => item !== null) || [],
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
