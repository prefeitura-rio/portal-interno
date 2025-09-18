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
    {
      groupLabel: 'Serviços municipais',
      menus: [
        {
          href: '',
          label: 'Serviços municipais',
          icon: FolderKanban,
          submenus: [
            {
              href: '/servicos-municipais/servicos',
              label: 'Serviços',
            },
            {
              href: '/servicos-municipais/servicos/new',
              label: 'Novo Serviço',
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
        },
      ],
    },
  ]
}
