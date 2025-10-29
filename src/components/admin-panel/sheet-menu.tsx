import { MenuIcon } from 'lucide-react'
import Link from 'next/link'

import { Menu } from '@/components/admin-panel/menu'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { PrefLogo } from '../icons/pref-logo'

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="sm:w-72 px-3 h-full flex flex-col min-h-0"
        side="left"
      >
        <SheetHeader>
          <Link
            href="/"
            className="flex justify-center items-center gap-2 pb-2 pt-1"
          >
            <PrefLogo fill="var(--primary)" className="w-16 h-auto" />
            <SheetTitle className="font-bold text-lg">
              Portal interno
            </SheetTitle>
          </Link>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <Menu isOpen />
        </div>
      </SheetContent>
    </Sheet>
  )
}
