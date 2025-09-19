export interface ServiceListItem {
  id: string
  title: string
  managingOrgan: string
  published_at: Date | null
  last_update: Date
  status: ServiceStatus
}

export type ServiceStatus = 'published' | 'waiting_approval' | 'in_edition'

export interface ServiceStatusConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
}

export interface ServiceFilters {
  status?: ServiceStatus[]
  managingOrgan?: string[]
  search?: string
}
