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
  orgao?: {
    id: number
    nome: string
  }
  organization?: string // Keep for backward compatibility
  modalidade:
    | 'ONLINE'
    | 'PRESENCIAL'
    | 'SEMIPRESENCIAL'
    | 'Remoto'
    | 'Presencial'
  status: 'draft' | 'opened' | 'ABERTO' | 'closed' | 'canceled'
  created_at: string
  updated_at: string
  enrollment_start_date?: string | null
  enrollment_end_date?: string | null
  // Additional fields that might be present
  carga_horaria?: number
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
  provider: string
  duration: number
  vacancies: number
  status: CourseStatus
  originalStatus?: CourseStatus // The actual status from API (for sending back)
  created_at: Date
  registration_start: Date | null
  registration_end: Date | null
  modalidade: string
  organization: string
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
  organization: string
  provider: string
  orgao?: {
    id: number
    nome: string
  }
  modalidade: string
  enrollmentStartDate: Date
  enrollmentEndDate: Date
  workload: string
  duration: number
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
  locations: Array<{
    id: string
    address: string
    neighborhood: string
    vacancies: number
    classStartDate: Date
    classEndDate: Date
    classTime: string
    classDays: string
  }>
  institutionalLogo: string | null
  coverImage: string | null
  customFields: any[]
  status: CourseStatus
  originalStatus?: CourseStatus // The actual status from API (for sending back)
  created_at: Date
  updated_at: Date
}

export type CourseModality = 'Presencial' | 'Remoto' | 'Semipresencial'

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
export type EnrollmentStatus = 'confirmed' | 'pending' | 'cancelled'

export interface Enrollment {
  id: string
  courseId: string
  candidateName: string
  cpf: string
  email: string
  age: number
  phone: string
  enrollmentDate: string
  status: EnrollmentStatus
  notes?: string
  customFields?: Record<string, string>
  created_at: string
  updated_at: string
}

export interface EnrollmentSummary {
  totalVacancies: number
  confirmedCount: number
  pendingCount: number
  cancelledCount: number
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
  email: string
  age: number
  phone: string
  notes?: string
  customFields?: Record<string, string>
}
