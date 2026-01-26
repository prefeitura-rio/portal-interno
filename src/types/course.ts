import type { Accessibility } from '../app/(private)/(app)/gorio/components/new-course-form'
import type { ModelsCitizenPersonalInfo } from '@/http-gorio/models'

// API Response types based on actual API responses
export interface ApiPagination {
  limit: number
  page: number
  total: number
  total_pages: number
}

export interface ApiCourse {
  id: number
  title: string
  description: string
  orgao_id?: string | null
  modalidade:
    | 'ONLINE'
    | 'PRESENCIAL'
    | 'LIVRE_FORMACAO_ONLINE'
    | 'Remoto'
    | 'Presencial'
  status: 'draft' | 'opened' | 'ABERTO' | 'closed' | 'canceled'
  created_at: string
  updated_at: string
  enrollment_start_date?: string | null
  enrollment_end_date?: string | null
  // External partner fields
  is_external_partner?: boolean
  course_management_type?: 'OWN_ORG' | 'EXTERNAL_MANAGED_BY_ORG' | 'EXTERNAL_MANAGED_BY_PARTNER'
  external_partner_name?: string
  external_partner_url?: string
  external_partner_logo_url?: string
  external_partner_contact?: string
  // Additional fields that might be present
  carga_horaria?: number
  accessibility?: Accessibility | undefined | ''
  numero_vagas?: number
  facilitador?: string
  local_realizacao?: string
  data_inicio?: string
  data_termino?: string
}

export interface ApiCoursesResponse {
  data: {
    courses: ApiCourse[]
    pagination: ApiPagination
  }
  success: boolean
}

export interface ApiDraftsResponse {
  data: {
    drafts: ApiCourse[]
    pagination: ApiPagination
  }
  success: boolean
}

// Frontend types for the table
export interface CourseListItem {
  id: string
  title: string
  duration: number
  vacancies: number
  status: CourseStatus
  originalStatus?: CourseStatus // The actual status from API (for sending back)
  created_at: Date
  registration_start: Date | null
  registration_end: Date | null
  modalidade: string
  orgao_id?: string | null
  // External partner fields (optional for CourseListItem)
  is_external_partner?: boolean
  course_management_type?: 'OWN_ORG' | 'EXTERNAL_MANAGED_BY_ORG' | 'EXTERNAL_MANAGED_BY_PARTNER'
  external_partner_name?: string
}

export type CourseStatus =
  | 'draft'
  | 'opened'
  | 'ABERTO'
  | 'closed'
  | 'canceled'
  | 'CRIADO'
  | 'ENCERRADO'
  | 'scheduled'
  | 'accepting_enrollments'
  | 'in_progress'
  | 'finished'

export interface CourseStatusConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
}

// Legacy types for backward compatibility (can be removed later)
export interface Course {
  id: string
  title: string
  description: string
  categorias?: Array<{ id: number; nome?: string }>
  orgao_id?: string | null
  modalidade: string
  theme?: string
  enrollmentStartDate: Date
  enrollmentEndDate: Date
  workload: string
  duration: number
  vacancies: number
  targetAudience: string
  target_audience: string // API field name
  prerequisites: string
  pre_requisitos: string // API field name
  hasCertificate: boolean
  has_certificate: boolean // API field name
  // External partner fields
  is_external_partner?: boolean
  external_partner_name?: string
  external_partner_url?: string
  external_partner_logo_url?: string
  external_partner_contact?: string
  facilitator: string
  objectives: string
  expectedResults: string
  expected_results: string // API field name
  programContent: string
  program_content: string // API field name
  methodology: string
  resourcesUsed: string
  resources_used: string // API field name
  materialUsed: string
  material_used: string // API field name
  teachingMaterial: string
  teaching_material: string // API field name
  locations: Array<{
    id: string
    address: string
    neighborhood: string
    // Old format fields (for backward compatibility)
    vacancies?: number
    classStartDate?: Date
    classEndDate?: Date
    classTime?: string
    classDays?: string
    // New format with schedules (turmas)
    schedules?: Array<{
      id?: string
      vacancies: number
      classStartDate: Date
      classEndDate: Date
      classTime: string
      classDays: string
    }>
  }>
  institutionalLogo: string | null
  institutional_logo: string | null // API field name
  coverImage: string | null
  cover_image: string | null // API field name
  customFields: any[]
  custom_fields: any[] // API field name
  remote_class?: {
    id?: string
    curso_id?: number
    vacancies: number
    class_start_date?: string
    class_end_date?: string
    class_time: string
    class_days: string
    created_at?: string
    updated_at?: string
  }
  status: CourseStatus
  originalStatus?: CourseStatus // The actual status from API (for sending back)
  created_at: Date
  updated_at: Date
}

export type CourseModality = 'Presencial' | 'Remoto' | 'Semipresencial' | 'Livre formação (online)'

export interface CourseLocation {
  id: string
  curso_id?: number
  address: string
  neighborhood: string
  vacancies: number
  classStartDate: Date
  classEndDate: Date
  classTime: string
  classDays: string
}

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'multiselect'

export interface CustomFieldOption {
  id: string
  value: string
}

export interface CustomField {
  id: string
  curso_id?: number
  title: string
  value?: string
  field_type?: CustomFieldType
  required: boolean
  options?: CustomFieldOption[]
  created_at?: string
  updated_at?: string
}

export interface RemoteClass {
  id?: string
  curso_id?: number
  vacancies: number
  class_start_date: string
  class_end_date: string
  class_time: string
  class_days: string
  created_at?: string
  updated_at?: string
  // For form usage - using camelCase for form compatibility
  classStartDate?: Date
  classEndDate?: Date
  classTime?: string
  classDays?: string
}

export interface CourseFormData {
  title: string
  description: string
  orgao_id: string
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

// Enrollment Types
export type EnrollmentStatus =
  | 'approved'
  | 'pending'
  | 'cancelled'
  | 'rejected'
  | 'concluded'

export interface EnrollmentSchedule {
  id: string
  location_id: string
  vacancies: number
  class_start_date: string
  class_end_date: string
  class_time: string
  class_days: string
  created_at: string
  updated_at: string
}

export interface EnrollmentUnit {
  id: string
  curso_id: number
  address: string
  neighborhood: string
  schedules: EnrollmentSchedule[]
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  courseId: string
  candidateName: string
  cpf: string
  email?: string
  phone: string
  address?: string
  neighborhood?: string
  age?: number
  enrollmentDate: string
  status: EnrollmentStatus
  notes?: string
  reason?: string
  customFields?: CustomField[]
  personal_info?: ModelsCitizenPersonalInfo
  created_at: string
  updated_at: string
  certificateUrl?: string
  schedule_id?: string
  enrolled_unit?: EnrollmentUnit
}

export interface EnrollmentSummary {
  totalVacancies: number
  confirmedCount: number
  pendingCount: number
  cancelledCount: number
  rejectedCount: number
  concludedCount: number
  remainingVacancies: number
}

export interface EnrollmentFilters {
  status?: EnrollmentStatus[]
  dateRange?: {
    start: Date
    end: Date
  }
  ageRange?: {
    min: number
    max: number
  }
  search?: string
}

export interface EnrollmentStatusConfig {
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
  className: string
  icon: React.ComponentType<{ className?: string }>
}

export interface EnrollmentAction {
  id: string
  enrollmentId: string
  action: 'confirm' | 'cancel'
  performedBy: string
  performedAt: string
  notes?: string
}

export interface EnrollmentResponse {
  enrollments: Enrollment[]
  summary: EnrollmentSummary
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export interface EnrollmentUpdateRequest {
  status: EnrollmentStatus
  notes?: string
}

export interface EnrollmentCreateRequest {
  courseId: string
  candidateName: string
  cpf: string
  email?: string
  age: number
  phone: string
  notes?: string
  customFields?: Record<string, string>
}
