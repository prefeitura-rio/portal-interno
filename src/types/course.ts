export type CourseStatus =
  | 'draft'
  | 'scheduled'
  | 'receiving_registrations'
  | 'in_progress'
  | 'finished'
  | 'cancelled'

export type CourseModality = 'Presencial' | 'Online' | 'Híbrido'

export interface CourseLocation {
  id: string
  address: string
  neighborhood: string
  vacancies: number
  classStartDate: Date
  classEndDate: Date
  classTime: string
  classDays: string
}

export interface CustomField {
  id: string
  label: string
  value: string
  type: 'text' | 'number' | 'date' | 'select'
  required: boolean
}

export interface Course {
  id: string
  title: string
  description: string
  organization: string
  provider: string
  modalidade: CourseModality
  enrollmentStartDate: Date
  enrollmentEndDate: Date
  workload: string
  duration: number // in hours
  vacancies: number
  targetAudience: string
  prerequisites: string
  hasCertificate: boolean
  facilitator: string
  objectives: string
  expectedResults: string
  programContent: string
  methodology: string
  resourcesUsed: string
  materialUsed: string
  teachingMaterial: string
  locations: CourseLocation[]
  institutionalLogo: string | null
  coverImage: string | null
  customFields: CustomField[]
  status: CourseStatus
  created_at: Date
  updated_at: Date
}

export interface CourseListItem {
  id: string
  title: string
  provider: string
  duration: number
  vacancies: number
  status: CourseStatus
  created_at: Date
  registration_start: Date
  registration_end: Date
}

export interface CourseFormData {
  title: string
  description: string
  organization: string
  modalidade: CourseModality
  enrollmentStartDate: Date
  enrollmentEndDate: Date
  workload: string
  targetAudience: string
  prerequisites: string
  hasCertificate: boolean
  facilitator: string
  objectives: string
  expectedResults: string
  programContent: string
  methodology: string
  resourcesUsed: string
  materialUsed: string
  teachingMaterial: string
  locations: CourseLocation[]
  institutionalLogo: string | null
  coverImage: string | null
  customFields: CustomField[]
}

export interface CourseStatusConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
  className: string
}

export interface CourseFilters {
  status?: CourseStatus[]
  provider?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  vacancies?: {
    min: number
    max: number
  }
  duration?: {
    min: number
    max: number
  }
}
