import {
  Briefcase,
  GraduationCap,
  LayoutGrid,
  type LucideIcon,
  Settings,
} from 'lucide-react'

type Submenu = {
  href: string
  label: string
  active?: boolean
}

type Menu = {
  href: string
  label: string
  active?: boolean
  icon: LucideIcon
  submenus?: Submenu[]
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
          submenus: [
            {
              href: '/gorio/courses',
              label: 'Cursos',
            },
            {
              href: '/gorio/courses/new',
              label: 'Novo Curso',
            },
          ],
        },
        {
          href: '',
          label: 'Emprego e Trabalho',
          icon: Briefcase,
          submenus: [
            {
              href: '/gorio/jobs',
              label: 'Vagas',
            },
            {
              href: '/gorio/jobs/new',
              label: 'Nova Vaga',
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
          label: 'Account',
          icon: Settings,
        },
      ],
    },
  ]
}
