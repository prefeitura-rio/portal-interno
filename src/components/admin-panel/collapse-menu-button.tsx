'use client'

import { ChevronDown, Dot, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { MenuItem, Submenu, SubmenuGroup } from '@/lib/menu-list'
import { cn } from '@/lib/utils'
import { DropdownMenuArrow } from '@radix-ui/react-dropdown-menu'
import { usePathname } from 'next/navigation'

function isSubmenuGroup(item: MenuItem): item is SubmenuGroup {
  return 'submenus' in item && !('href' in item)
}

function NestedSubmenuGroup({
  group,
  isOpen,
}: {
  group: SubmenuGroup
  isOpen: boolean | undefined
}) {
  const pathname = usePathname()
  const groupSubmenuActive = group.submenus.some(submenu =>
    submenu.active === undefined ? submenu.href === pathname : submenu.active
  )
  const [isGroupCollapsed, setIsGroupCollapsed] =
    useState<boolean>(groupSubmenuActive)

  return (
    <Collapsible
      open={isGroupCollapsed}
      onOpenChange={setIsGroupCollapsed}
      className="w-full"
    >
      <CollapsibleTrigger
        className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1"
        asChild
      >
        <Button
          variant={groupSubmenuActive ? 'secondary' : 'ghost'}
          className="w-full justify-start h-10"
        >
          <div className="w-full items-center flex justify-between">
            <div className="flex items-center">
              <span className="mr-2 ml-2">
                <Dot size={18} />
              </span>
              <p
                className={cn(
                  'max-w-[150px] truncate text-sm font-medium',
                  isOpen
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-96 opacity-0'
                )}
              >
                {group.label}
              </p>
            </div>
            <div
              className={cn(
                'whitespace-nowrap',
                isOpen
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-96 opacity-0'
              )}
            >
              <ChevronDown
                size={16}
                className="transition-transform duration-200 "
              />
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {group.submenus.map((submenu, subIndex) => (
          <Button
            key={subIndex}
            variant={
              (submenu.active === undefined && pathname === submenu.href) ||
              submenu.active
                ? 'secondary'
                : 'ghost'
            }
            className="w-full justify-start h-10 mb-1 pl-10"
            asChild
          >
            <Link href={submenu.href}>
              <span>
                <Dot size={18} />
              </span>
              <p
                className={cn(
                  'max-w-[190px] truncate',
                  isOpen
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-96 opacity-0'
                )}
              >
                {submenu.label}
              </p>
            </Link>
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface CollapseMenuButtonProps {
  icon: LucideIcon
  label: string
  active: boolean
  submenus: MenuItem[]
  isOpen: boolean | undefined
}

export function CollapseMenuButton({
  icon: Icon,
  label,
  active,
  submenus,
  isOpen,
}: CollapseMenuButtonProps) {
  const pathname = usePathname()
  const isSubmenuActive = submenus.some(item => {
    if (isSubmenuGroup(item)) {
      return item.submenus.some(submenu =>
        submenu.active === undefined
          ? submenu.href === pathname
          : submenu.active
      )
    }
    return item.active === undefined ? item.href === pathname : item.active
  })
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isSubmenuActive)

  return isOpen ? (
    <Collapsible
      open={isCollapsed}
      onOpenChange={setIsCollapsed}
      className="w-full"
    >
      <CollapsibleTrigger
        className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1"
        asChild
      >
        <Button
          variant={isSubmenuActive ? 'secondary' : 'ghost'}
          className="w-full justify-start h-10"
        >
          <div className="w-full items-center flex justify-between">
            <div className="flex items-center">
              <span className="mr-4">
                <Icon size={18} />
              </span>
              <p
                className={cn(
                  'max-w-[150px] truncate',
                  isOpen
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-96 opacity-0'
                )}
              >
                {label}
              </p>
            </div>
            <div
              className={cn(
                'whitespace-nowrap',
                isOpen
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-96 opacity-0'
              )}
            >
              <ChevronDown
                size={18}
                className="transition-transform duration-200"
              />
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {submenus.map((item, index) => {
          if (isSubmenuGroup(item)) {
            return (
              <NestedSubmenuGroup key={index} group={item} isOpen={isOpen} />
            )
          }
          return (
            <Button
              key={index}
              variant={
                (item.active === undefined && pathname === item.href) ||
                item.active
                  ? 'secondary'
                  : 'ghost'
              }
              className="w-full justify-start h-10 mb-1"
              asChild
            >
              <Link href={item.href}>
                <span className="">
                  <Dot size={18} />
                </span>
                <p
                  className={cn(
                    'max-w-[170px] truncate',
                    isOpen
                      ? 'translate-x-0 opacity-100'
                      : '-translate-x-96 opacity-0'
                  )}
                >
                  {item.label}
                </p>
              </Link>
            </Button>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  ) : (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isSubmenuActive ? 'secondary' : 'ghost'}
                className="w-full justify-start h-10 mb-1"
              >
                <div className="w-full items-center flex justify-between">
                  <div className="flex items-center">
                    <span className={cn(isOpen === false ? '' : 'mr-4')}>
                      <Icon size={18} />
                    </span>
                    <p
                      className={cn(
                        'max-w-[200px] truncate',
                        isOpen === false ? 'opacity-0' : 'opacity-100'
                      )}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" alignOffset={2}>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent side="right" sideOffset={25} align="start">
        <DropdownMenuLabel className="max-w-[190px] truncate">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {submenus.map((item, index) => {
          if (isSubmenuGroup(item)) {
            return (
              <div key={index}>
                <DropdownMenuLabel className="max-w-[190px] truncate text-xs font-semibold text-muted-foreground px-2 py-1.5">
                  {item.label}
                </DropdownMenuLabel>
                {item.submenus.map((submenu, subIndex) => (
                  <DropdownMenuItem key={subIndex} asChild>
                    <Link
                      className={`cursor-pointer pl-4 ${
                        ((submenu.active === undefined &&
                          pathname === submenu.href) ||
                          submenu.active) &&
                        'bg-secondary'
                      }`}
                      href={submenu.href}
                    >
                      <p className="max-w-[180px] truncate">{submenu.label}</p>
                    </Link>
                  </DropdownMenuItem>
                ))}
                {index < submenus.length - 1 && <DropdownMenuSeparator />}
              </div>
            )
          }
          return (
            <DropdownMenuItem key={index} asChild>
              <Link
                className={`cursor-pointer ${
                  ((item.active === undefined && pathname === item.href) ||
                    item.active) &&
                  'bg-secondary'
                }`}
                href={item.href}
              >
                <p className="max-w-[180px] truncate">{item.label}</p>
              </Link>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuArrow className="fill-border" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
