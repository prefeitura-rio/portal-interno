'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import Link from 'next/link'
import { Fragment } from 'react'

interface BreadcrumbEntry {
  label: string
  href?: string
}

interface HeimdallPageHeaderProps {
  title: string
  description: string
  breadcrumbs: BreadcrumbEntry[]
  /** Conteúdo exibido à direita do título (ex: botão de criação). */
  actions?: React.ReactNode
}

export function HeimdallPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: HeimdallPageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Acesso restrito</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Heimdall admin</BreadcrumbItem>
          {breadcrumbs.map((entry, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <Fragment key={entry.label}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{entry.label}</BreadcrumbPage>
                  ) : entry.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={entry.href}>{entry.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    entry.label
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions}
      </div>
    </div>
  )
}
