import type { CourseData, CourseLocation } from '../types'

export interface ScheduleOption {
  id: string
  label: string
  locationId: string
  locationAddress: string
}

interface Schedule {
  id?: string
  vacancies: number
  classStartDate?: Date | string
  classEndDate?: Date | string
  classTime?: string
  classDays?: string
}

/**
 * Extracts all schedules from course locations and formats them for a dropdown
 */
export function getScheduleOptions(courseData?: CourseData | null): ScheduleOption[] {
  if (!courseData?.locations || courseData.locations.length === 0) {
    return []
  }

  const options: ScheduleOption[] = []

  courseData.locations.forEach((location: CourseLocation) => {
    if (!location.schedules || location.schedules.length === 0) {
      // Fallback: old format without schedules array
      if (location.classTime || location.classDays) {
        options.push({
          id: location.id || crypto.randomUUID(),
          label: formatScheduleLabel(
            location.address || '',
            location.classTime || '',
            location.classDays || ''
          ),
          locationId: location.id || '',
          locationAddress: location.address || '',
        })
      }
      return
    }

    // New format with schedules array
    location.schedules.forEach((schedule: Schedule) => {
      // Use the schedule ID directly from backend
      if (!schedule.id) {
        console.error('Schedule without ID found - skipping. Backend should always provide schedule IDs:', schedule)
        return
      }

      options.push({
        id: schedule.id,
        label: formatScheduleLabel(
          location.address || '',
          schedule.classTime || '',
          schedule.classDays || ''
        ),
        locationId: location.id || '',
        locationAddress: location.address || '',
      })
    })
  })

  return options
}

/**
 * Formats a schedule label for display in dropdown
 * Format: "Partial Address | Time | Days"
 * Example: "Rua Planalto | 23h - 00h | Sexta e sábado"
 */
function formatScheduleLabel(
  address: string,
  classTime: string,
  classDays: string
): string {
  const addressPart = getPartialAddress(address)
  return `${addressPart} | ${classTime} | ${classDays}`
}

/**
 * Gets a partial/shortened version of an address
 * Takes the first part before comma or first 50 characters
 */
function getPartialAddress(address: string): string {
  if (!address) return 'Endereço não informado'

  // Try to get the street name (before first comma)
  const beforeComma = address.split(',')[0]
  if (beforeComma && beforeComma.length <= 50) {
    return beforeComma.trim()
  }

  // If no comma or still too long, truncate
  return address.length > 50 ? `${address.substring(0, 47)}...` : address
}

/**
 * Checks if course has multiple schedules requiring selection
 */
export function hasMultipleSchedules(courseData?: CourseData | null): boolean {
  const options = getScheduleOptions(courseData)
  return options.length > 1
}

/**
 * Gets the modalidade label for display
 */
export function getModalidadeLabel(modalidade?: string): string {
  if (!modalidade) return 'Não informada'

  const modalidadeMap: Record<string, string> = {
    PRESENCIAL: 'Presencial',
    ONLINE: 'Online',
    HIBRIDO: 'Híbrido',
    SEMIPRESENCIAL: 'Semipresencial',
  }

  return modalidadeMap[modalidade.toUpperCase()] || modalidade
}
