export type ModalStep =
  | 'options'
  | 'manual'
  | 'spreadsheet'
  | 'processing'
  | 'results'
  | 'finish'

export type FinishStatus = 'loading' | 'success' | 'error'

export interface JobError {
  line: number
  data: string
  message: string
}

export interface JobResult {
  success_count: number
  error_count: number
  duplicate_count: number
  total_records?: number
  errors?: JobError[]
}

export interface CustomField {
  id: string
  name?: string
  title?: string
  type?: string
  field_type?: string
  required: boolean
  options?: string[] | Array<{ id: string; value: string }>
}

export interface CourseLocation {
  id?: string
  address?: string
  neighborhood?: string
  // Old format fields (for backward compatibility)
  vacancies?: number
  classStartDate?: Date | string
  classEndDate?: Date | string
  class_end_date?: string
  classTime?: string
  classDays?: string
  // New format with schedules (turmas)
  schedules?: Array<{
    id?: string
    vacancies: number
    classStartDate?: Date | string
    classEndDate?: Date | string
    classTime?: string
    classDays?: string
  }>
}

export interface CourseData {
  id?: string | number
  title?: string
  modalidade?: string
  custom_fields?: CustomField[]
  locations?: CourseLocation[]
  remote_class?: {
    id?: string
    vacancies?: number
    class_start_date?: string
    class_end_date?: string
    class_time?: string
    class_days?: string
    schedules?: Array<{
      id?: string
      remote_class_id?: string
      vacancies: number
      class_start_date?: string
      class_end_date?: string
      class_time?: string
      class_days?: string
      remaining_vacancies?: number
      created_at?: string
      updated_at?: string
    }>
  }
}

export interface AddParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  onSuccess?: () => void | Promise<void>
  courseData?: CourseData | null
}

export interface StepComponentProps {
  onBack: () => void
  onFinish: (success: boolean) => void
}

export interface ManualFormProps extends StepComponentProps {
  courseId: string
  courseData?: CourseData | null
}

export interface SpreadsheetFormProps extends StepComponentProps {
  courseId: string
  courseData?: CourseData | null
  onStartProcessing: () => void
  onProcessingComplete: (result: JobResult) => void
}

export interface OptionsStepProps {
  onSelect: (mode: Extract<ModalStep, 'manual' | 'spreadsheet'>) => void
}

export interface FinishStepProps {
  status: FinishStatus
  onRetry: () => void
}

export interface ModalHeaderProps {
  step: ModalStep
  onClose: () => void
}

export type ProcessingStepProps = Record<string, never>

export interface ResultsStepProps {
  result: JobResult
  onClose: () => void
}

export interface UseAddParticipantsModalReturn {
  step: ModalStep
  finishStatus: FinishStatus
  jobResult: JobResult | null
  handleFinish: (success: boolean) => Promise<void>
  handleBack: () => void
  handleSelectMode: (mode: Extract<ModalStep, 'manual' | 'spreadsheet'>) => void
  handleRetry: () => void
  resetModal: () => void
  setStep: (step: ModalStep) => void
  setJobResult: (result: JobResult) => void
}
