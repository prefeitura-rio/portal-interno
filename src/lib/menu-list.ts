import {
  Briefcase,
  GraduationCap,
  LayoutGrid,
  type LucideIcon,
  Settings,
} from 'lucide-react'
import type { UserRole } from './jwt-utils'

type Submenu = {
  href: string
  label: string
  active?: boolean
  allowedRoles?: UserRole[]
}

type Menu = {
  href: string
  label: string
  active?: boolean
  icon: LucideIcon
  submenus?: Submenu[]
  allowedRoles?: UserRole[]
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
          allowedRoles: ['admin', 'geral', 'editor'],
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
          allowedRoles: ['admin', 'geral'],
          submenus: [
            {
              href: '/gorio/courses',
              label: 'Cursos',
              allowedRoles: ['admin', 'geral'],
            },
            {
              href: '/gorio/courses/new',
              label: 'Novo Curso',
              allowedRoles: ['admin', 'geral'],
            },
          ],
        },
        {
          href: '',
          label: 'Emprego e trabalho',
          icon: Briefcase,
          allowedRoles: ['admin', 'geral'],
          submenus: [
            {
              href: '/gorio/oportunidades-mei',
              label: 'Oportunidades MEI',
              allowedRoles: ['admin', 'geral'],
            },
            {
              href: '/gorio/oportunidades-mei/new',
              label: 'Nova oportunidade MEI',
              allowedRoles: ['admin', 'geral'],
            },
          ],
        },
      ],
    },
    // {
    //   groupLabel: 'Serviços municipais',
    //   menus: [
    //     {
    //       href: '',
    //       label: 'Serviços municipais',
    //       icon: FolderKanban,
    //       allowedRoles: ['admin', 'geral', 'editor'],
    //       submenus: [
    //         {
    //           href: '/servicos-municipais/servicos',
    //           label: 'Serviços',
    //           allowedRoles: ['admin', 'geral', 'editor'],
    //         },
    //         {
    //           href: '/servicos-municipais/servicos/new',
    //           label: 'Novo Serviço',
    //           allowedRoles: ['admin', 'geral'],
    //         },
    //       ],
    //     },
    //   ],
    // },
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
          allowedRoles: ['admin', 'geral', 'editor'],
        },
      ],
    },
  ]
}

/**
 * Filters menu items based on user role
 * @param menuList - The complete menu list
 * @param userRole - The user's role
 * @returns Filtered menu list based on user permissions
 */
export function getFilteredMenuList(
  pathname: string,
  userRole: UserRole | null
): Group[] {
  if (!userRole) return []

  const fullMenuList = getMenuList(pathname)

  return fullMenuList
    .map(group => ({
      ...group,
      menus: group.menus
        .filter(
          menu => !menu.allowedRoles || menu.allowedRoles.includes(userRole)
        )
        .map(menu => ({
          ...menu,
          submenus:
            menu.submenus?.filter(
              submenu =>
                !submenu.allowedRoles || submenu.allowedRoles.includes(userRole)
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
