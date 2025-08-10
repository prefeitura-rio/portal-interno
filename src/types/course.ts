export type CourseStatus =
  | 'draft'
  | 'scheduled'
  | 'receiving_registrations'
  | 'in_progress'
  | 'finished'
  | 'cancelled'

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

// Enrollment Types
export type EnrollmentStatus =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'waitlist'

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
  waitlistCount: number
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
  action: 'confirm' | 'cancel' | 'move_to_waitlist'
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
