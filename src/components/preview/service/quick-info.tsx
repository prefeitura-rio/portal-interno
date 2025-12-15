'use client'

import { CostIcon } from '@/components/icons/cost-icon'
import { DepartmentIcon } from '@/components/icons/department-icon'
import { ChevronRight, Clock, Tag } from 'lucide-react'
import type { ReactNode } from 'react'

interface QuickInfoItemProps {
  icon: ReactNode
  label: string
  value: string
  showArrow?: boolean
  layout?: 'row' | 'column'
}

function QuickInfoItem({
  icon,
  label,
  value,
  showArrow = false,
  layout = 'column',
}: QuickInfoItemProps) {
  if (layout === 'row') {
    // Row layout: ícone + label + valor
    return (
      <div className="flex items-center gap-4 bg-card rounded-2xl p-4 w-full">
        {/* Icon */}
        <div className="flex-shrink-0 text-foreground">{icon}</div>

        {/* Label */}
        <span className="text-sm text-foreground-light flex-shrink-0 leading-4">
          {label}
        </span>

        {/* Value */}
        <span className="text-sm text-primary font-normal ml-auto leading-5 text-right break-words min-w-0">
          {value}
        </span>

        {/* Arrow (optional) */}
        {showArrow && (
          <ChevronRight className="w-5 h-5 text-foreground-light flex-shrink-0" />
        )}
      </div>
    )
  }

  // Column layout: icon + (label/valor)
  return (
    <div className="flex items-center gap-4 bg-card rounded-2xl p-4 w-full">
      <div className="flex-shrink-0 text-foreground">{icon}</div>

      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm text-foreground-light">{label}</span>
        <span className="text-sm text-primary font-normal leading-5 break-words">
          {value}
        </span>
      </div>

      {showArrow && (
        <ChevronRight className="w-5 h-5 text-foreground-light flex-shrink-0" />
      )}
    </div>
  )
}

interface QuickInfoCostProps {
  value: string
}

export function QuickInfoCost({ value }: QuickInfoCostProps) {
  return (
    <QuickInfoItem
      icon={<CostIcon className="w-5 h-5 text-foreground-light" />}
      label="Custo"
      value={value}
      layout="row"
    />
  )
}

interface QuickInfoTimeProps {
  value: string
}

export function QuickInfoTime({ value }: QuickInfoTimeProps) {
  return (
    <QuickInfoItem
      icon={<Clock className="w-5 h-5 text-foreground-light" />}
      label="Tempo de atendimento"
      value={value}
      layout="row"
    />
  )
}

interface QuickInfoCategoryProps {
  value: string
}

export function QuickInfoCategory({ value }: QuickInfoCategoryProps) {
  return (
    <QuickInfoItem
      icon={<Tag className="w-5 h-5 text-foreground-light" />}
      label="Categoria"
      value={value}
      layout="row"
    />
  )
}

interface QuickInfoDepartmentProps {
  value: string
}

export function QuickInfoDepartment({ value }: QuickInfoDepartmentProps) {
  return (
    <QuickInfoItem
      icon={<DepartmentIcon className="w-5 h-5 text-foreground-light" />}
      label="Órgão gestor"
      value={value}
    />
  )
}

interface QuickInfoProps {
  children: ReactNode
}

// Wrapper component for QuickInfo items
export function QuickInfo({ children }: QuickInfoProps) {
  return <div className="flex flex-col gap-2">{children}</div>
}
