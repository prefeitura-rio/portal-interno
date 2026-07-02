import { normalizeString } from '@/app/(private)/(app)/gorio/components/add-participants/utils/string-utils'
import type { ModelsCitizenPersonalInfo } from '@/http-gorio/models'
import type { Enrollment } from '@/types/course'

const INVALID_PLACEHOLDER_EMAILS = ['naotem@email.com', '0@0.aa']

export interface RmiPersonalInfoExtended extends ModelsCitizenPersonalInfo {
  nome?: string
}

export interface SubmittedEnrollmentData {
  name?: string
  phone?: string
  email?: string
  address?: string
  neighborhood?: string
  age?: number
  cpf?: string
  line?: number
}

export interface FieldDivergence {
  field: string
  label: string
  submitted: string
  rmi: string
}

export interface RmiEnrollmentValues {
  name: string
  phone: string
  email: string
}

export interface EnrollmentRmiDivergence {
  enrollmentId: string
  cpf: string
  line?: number
  divergences: FieldDivergence[]
  submittedData: SubmittedEnrollmentData
  rmiData: RmiEnrollmentValues
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  phone: 'Telefone',
  email: 'E-mail',
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export function normalizePhoneForComparison(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const withoutCountry =
    digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
  return withoutCountry.slice(-11)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string | undefined): boolean {
  if (!email?.trim()) return false
  const normalized = normalizeEmail(email)
  return !INVALID_PLACEHOLDER_EMAILS.includes(normalized)
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

export function extractRmiDisplayValues(
  personalInfo: RmiPersonalInfoExtended
): RmiEnrollmentValues {
  return {
    name: personalInfo.nome?.trim() || '',
    phone: personalInfo.celular?.trim() || '',
    email: isValidEmail(personalInfo.email) ? personalInfo.email!.trim() : '',
  }
}

function compareName(submitted: string, rmi: string): boolean {
  if (!hasText(submitted) || !hasText(rmi)) return true
  return normalizeString(submitted) === normalizeString(rmi)
}

function comparePhone(submitted: string, rmi: string): boolean {
  if (!hasText(submitted) || !hasText(rmi)) return true
  return (
    normalizePhoneForComparison(submitted) === normalizePhoneForComparison(rmi)
  )
}

function compareEmail(submitted: string, rmi: string): boolean {
  if (!isValidEmail(submitted) || !isValidEmail(rmi)) return true
  return normalizeEmail(submitted) === normalizeEmail(rmi)
}

export function compareEnrollmentWithRmi(
  submitted: SubmittedEnrollmentData,
  personalInfo: RmiPersonalInfoExtended | undefined | null,
  enrollmentId: string
): EnrollmentRmiDivergence | null {
  if (!personalInfo || !enrollmentId) return null

  const rmiData = extractRmiDisplayValues(personalInfo)
  const divergences: FieldDivergence[] = []

  if (!compareName(submitted.name || '', rmiData.name)) {
    divergences.push({
      field: 'name',
      label: FIELD_LABELS.name,
      submitted: submitted.name?.trim() || '',
      rmi: rmiData.name,
    })
  }

  if (!comparePhone(submitted.phone || '', rmiData.phone)) {
    divergences.push({
      field: 'phone',
      label: FIELD_LABELS.phone,
      submitted: submitted.phone?.trim() || '',
      rmi: rmiData.phone,
    })
  }

  if (!compareEmail(submitted.email || '', rmiData.email)) {
    divergences.push({
      field: 'email',
      label: FIELD_LABELS.email,
      submitted: submitted.email?.trim() || '',
      rmi: rmiData.email,
    })
  }

  if (divergences.length === 0) return null

  return {
    enrollmentId,
    cpf: normalizeCpf(submitted.cpf || ''),
    line: submitted.line,
    divergences,
    submittedData: submitted,
    rmiData,
  }
}

export function mapRmiToEnrollmentUpdate(
  rmiData: RmiEnrollmentValues
): Record<string, string> {
  const update: Record<string, string> = {}

  if (rmiData.name) update.name = rmiData.name
  if (rmiData.phone) update.phone = rmiData.phone
  if (rmiData.email) update.email = rmiData.email

  return update
}

export function getEnrollmentRmiDivergence(
  enrollment: Enrollment
): EnrollmentRmiDivergence | null {
  return compareEnrollmentWithRmi(
    {
      name: enrollment.declaredName,
      cpf: enrollment.cpf,
      phone: enrollment.phone,
      email: enrollment.declaredEmail,
    },
    enrollment.personal_info,
    enrollment.id
  )
}

export function hasEnrollmentRmiDivergence(enrollment: Enrollment): boolean {
  return getEnrollmentRmiDivergence(enrollment) !== null
}

export async function fetchEnrollmentRmiDivergences(
  courseId: string,
  entries: SubmittedEnrollmentData[]
): Promise<EnrollmentRmiDivergence[]> {
  if (entries.length === 0) return []

  const response = await fetch(
    `/api/enrollments/${courseId}/check-rmi-consistency`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    }
  )

  if (!response.ok) return []

  const data = (await response.json()) as {
    divergences?: EnrollmentRmiDivergence[]
  }
  return data.divergences || []
}
