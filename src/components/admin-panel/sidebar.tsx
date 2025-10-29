'use client'
import { Menu } from '@/components/admin-panel/menu'
import { SidebarToggle } from '@/components/admin-panel/sidebar-toggle'
import { useSidebar } from '@/hooks/use-sidebar'
import { useStore } from '@/hooks/use-store'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { PrefLogo } from '../icons/pref-logo'

export function Sidebar() {
  const sidebar = useStore(useSidebar, x => x)
  if (!sidebar) return null
  const { isOpen, toggleOpen, getOpenState, setIsHover, settings } = sidebar
  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300',
        !getOpenState() ? 'w-[90px]' : 'w-72',
        settings.disabled && 'hidden'
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative h-full flex flex-col px-3 py-4 overflow-y-auto shadow-md dark:shadow-zinc-800"
      >
        <Link
          href="/"
          className={cn(
            'flex items-center mx-1 mb-1 transition-transform ease-in-out duration-300',
            !getOpenState() ? 'translate-x-1' : 'translate-x-0'
          )}
        >
          <PrefLogo fill="var(--primary)" className="w-30 h-auto" />
          <h1
            className={cn(
              'font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300',
              !getOpenState()
                ? '-translate-x-96 opacity-0 hidden'
                : 'translate-x-0 opacity-100'
            )}
          >
            Portal interno
          </h1>
        </Link>
        <Menu isOpen={getOpenState()} />
      </div>
    </aside>
  )
}
