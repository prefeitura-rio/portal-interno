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

// Service model that matches the form structure
export interface Service {
  id: string
  managingOrgan: string
  serviceCategory: string
  targetAudience: string
  title: string
  shortDescription: string
  whatServiceDoesNotCover?: string
  serviceTime?: string
  serviceCost?: string
  isFree?: boolean
  requestResult?: string
  fullDescription?: string
  requiredDocuments?: string
  instructionsForRequester?: string
  digitalChannels?: string[]
  physicalChannels?: string[]
  status: ServiceStatus
  published_at?: Date | null
  last_update: Date
  created_at: Date
}
