import type { Enrollment, EnrollmentSummary } from '@/types/course'

// Mock enrollment data for different courses
export const mockEnrollments: Record<string, Enrollment[]> = {
  '1': [
    {
      id: '1',
      courseId: '1',
      candidateName: 'João Silva Santos',
      cpf: '123.456.789-00',
      email: 'joao.silva@email.com',
      age: 28,
      phone: '(21) 99999-9999',
      enrollmentDate: '2025-01-15T10:00:00Z',
      status: 'confirmed',
      notes: 'Candidato muito interessado no curso',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-16T14:30:00Z',
    },
    {
      id: '2',
      courseId: '1',
      candidateName: 'Maria Alves Costa',
      cpf: '987.654.321-00',
      email: 'maria.alves@email.com',
      age: 32,
      phone: '(21) 88888-8888',
      enrollmentDate: '2025-01-18T14:30:00Z',
      status: 'pending',
      notes: 'Aguardando confirmação de documentos',
      created_at: '2025-01-18T14:30:00Z',
      updated_at: '2025-01-18T14:30:00Z',
    },
    {
      id: '3',
      courseId: '1',
      candidateName: 'Pedro Costa Oliveira',
      cpf: '456.789.123-00',
      email: 'pedro.costa@email.com',
      age: 25,
      phone: '(21) 77777-7777',
      enrollmentDate: '2025-01-20T09:15:00Z',
      status: 'confirmed',
      created_at: '2025-01-20T09:15:00Z',
      updated_at: '2025-01-21T11:20:00Z',
    },
    {
      id: '4',
      courseId: '1',
      candidateName: 'Ana Santos Ferreira',
      cpf: '789.123.456-00',
      email: 'ana.santos@email.com',
      age: 29,
      phone: '(21) 66666-6666',
      enrollmentDate: '2025-01-22T16:45:00Z',
      status: 'pending',
      created_at: '2025-01-22T16:45:00Z',
      updated_at: '2025-01-22T16:45:00Z',
    },
    {
      id: '5',
      courseId: '1',
      candidateName: 'Carlos Oliveira Lima',
      cpf: '321.654.987-00',
      email: 'carlos.oliveira@email.com',
      age: 35,
      phone: '(21) 55555-5555',
      enrollmentDate: '2025-01-25T11:20:00Z',
      status: 'confirmed',
      created_at: '2025-01-25T11:20:00Z',
      updated_at: '2025-01-26T09:45:00Z',
    },
    {
      id: '6',
      courseId: '1',
      candidateName: 'Fernanda Lima Martins',
      cpf: '654.321.987-00',
      email: 'fernanda.lima@email.com',
      age: 27,
      phone: '(21) 44444-4444',
      enrollmentDate: '2025-01-28T13:10:00Z',
      status: 'cancelled',
      notes: 'Cancelado por solicitação do candidato',
      created_at: '2025-01-28T13:10:00Z',
      updated_at: '2025-01-29T10:15:00Z',
    },
    {
      id: '7',
      courseId: '1',
      candidateName: 'Roberto Ferreira Silva',
      cpf: '147.258.369-00',
      email: 'roberto.ferreira@email.com',
      age: 31,
      phone: '(21) 33333-3333',
      enrollmentDate: '2025-01-30T08:30:00Z',
      status: 'confirmed',
      created_at: '2025-01-30T08:30:00Z',
      updated_at: '2025-01-31T15:20:00Z',
    },
    {
      id: '8',
      courseId: '1',
      candidateName: 'Juliana Martins Costa',
      cpf: '258.369.147-00',
      email: 'juliana.martins@email.com',
      age: 26,
      phone: '(21) 22222-2222',
      enrollmentDate: '2025-02-01T15:45:00Z',
      status: 'waitlist',
      notes: 'Lista de espera - vagas esgotadas',
      created_at: '2025-02-01T15:45:00Z',
      updated_at: '2025-02-01T15:45:00Z',
    },
    {
      id: '9',
      courseId: '1',
      candidateName: 'Lucas Mendes Pereira',
      cpf: '369.147.258-00',
      email: 'lucas.mendes@email.com',
      age: 24,
      phone: '(21) 11111-1111',
      enrollmentDate: '2025-01-10T12:00:00Z',
      status: 'confirmed',
      created_at: '2025-01-10T12:00:00Z',
      updated_at: '2025-01-11T16:30:00Z',
    },
    {
      id: '10',
      courseId: '1',
      candidateName: 'Camila Rodrigues Alves',
      cpf: '147.258.369-00',
      email: 'camila.rodrigues@email.com',
      age: 30,
      phone: '(21) 00000-0000',
      enrollmentDate: '2025-01-12T09:30:00Z',
      status: 'confirmed',
      created_at: '2025-01-12T09:30:00Z',
      updated_at: '2025-01-13T14:15:00Z',
    },
    {
      id: '11',
      courseId: '1',
      candidateName: 'Diego Souza Santos',
      cpf: '258.369.147-00',
      email: 'diego.souza@email.com',
      age: 28,
      phone: '(21) 12121-2121',
      enrollmentDate: '2025-01-14T16:45:00Z',
      status: 'pending',
      created_at: '2025-01-14T16:45:00Z',
      updated_at: '2025-01-14T16:45:00Z',
    },
    {
      id: '12',
      courseId: '1',
      candidateName: 'Amanda Costa Silva',
      cpf: '369.258.147-00',
      email: 'amanda.costa@email.com',
      age: 33,
      phone: '(21) 13131-3131',
      enrollmentDate: '2025-01-05T10:15:00Z',
      status: 'confirmed',
      created_at: '2025-01-05T10:15:00Z',
      updated_at: '2025-01-06T11:45:00Z',
    },
  ],
  '2': [
    {
      id: '9',
      courseId: '2',
      candidateName: 'Lucas Mendes Pereira',
      cpf: '369.147.258-00',
      email: 'lucas.mendes@email.com',
      age: 24,
      phone: '(21) 11111-1111',
      enrollmentDate: '2025-01-10T12:00:00Z',
      status: 'confirmed',
      created_at: '2025-01-10T12:00:00Z',
      updated_at: '2025-01-11T16:30:00Z',
    },
    {
      id: '10',
      courseId: '2',
      candidateName: 'Camila Rodrigues Alves',
      cpf: '147.258.369-00',
      email: 'camila.rodrigues@email.com',
      age: 30,
      phone: '(21) 00000-0000',
      enrollmentDate: '2025-01-12T09:30:00Z',
      status: 'confirmed',
      created_at: '2025-01-12T09:30:00Z',
      updated_at: '2025-01-13T14:15:00Z',
    },
    {
      id: '11',
      courseId: '2',
      candidateName: 'Diego Souza Santos',
      cpf: '258.369.147-00',
      email: 'diego.souza@email.com',
      age: 28,
      phone: '(21) 12121-2121',
      enrollmentDate: '2025-01-14T16:45:00Z',
      status: 'pending',
      created_at: '2025-01-14T16:45:00Z',
      updated_at: '2025-01-14T16:45:00Z',
    },
  ],
  '3': [
    {
      id: '12',
      courseId: '3',
      candidateName: 'Amanda Costa Silva',
      cpf: '369.258.147-00',
      email: 'amanda.costa@email.com',
      age: 33,
      phone: '(21) 13131-3131',
      enrollmentDate: '2025-01-05T10:15:00Z',
      status: 'confirmed',
      created_at: '2025-01-05T10:15:00Z',
      updated_at: '2025-01-06T11:45:00Z',
    },
    {
      id: '13',
      courseId: '3',
      candidateName: 'Thiago Oliveira Lima',
      cpf: '147.369.258-00',
      email: 'thiago.oliveira@email.com',
      age: 29,
      phone: '(21) 14141-4141',
      enrollmentDate: '2025-01-07T14:20:00Z',
      status: 'confirmed',
      created_at: '2025-01-07T14:20:00Z',
      updated_at: '2025-01-08T09:30:00Z',
    },
    {
      id: '14',
      courseId: '3',
      candidateName: 'Bianca Santos Ferreira',
      cpf: '258.147.369-00',
      email: 'bianca.santos@email.com',
      age: 26,
      phone: '(21) 15151-5151',
      enrollmentDate: '2025-01-09T11:30:00Z',
      status: 'cancelled',
      notes: 'Cancelado - conflito de horário',
      created_at: '2025-01-09T11:30:00Z',
      updated_at: '2025-01-10T08:45:00Z',
    },
  ],
  '4': [
    {
      id: '15',
      courseId: '4',
      candidateName: 'Rafael Mendes Costa',
      cpf: '159.357.486-00',
      email: 'rafael.mendes@email.com',
      age: 31,
      phone: '(21) 16161-6161',
      enrollmentDate: '2025-01-12T09:00:00Z',
      status: 'confirmed',
      created_at: '2025-01-12T09:00:00Z',
      updated_at: '2025-01-13T14:30:00Z',
    },
    {
      id: '16',
      courseId: '4',
      candidateName: 'Carolina Alves Santos',
      cpf: '753.951.486-00',
      email: 'carolina.alves@email.com',
      age: 28,
      phone: '(21) 17171-7171',
      enrollmentDate: '2025-01-14T11:30:00Z',
      status: 'pending',
      created_at: '2025-01-14T11:30:00Z',
      updated_at: '2025-01-14T11:30:00Z',
    },
    {
      id: '17',
      courseId: '4',
      candidateName: 'Gabriel Silva Oliveira',
      cpf: '951.753.486-00',
      email: 'gabriel.silva@email.com',
      age: 24,
      phone: '(21) 18181-8181',
      enrollmentDate: '2025-01-16T15:45:00Z',
      status: 'waitlist',
      notes: 'Lista de espera - curso lotado',
      created_at: '2025-01-16T15:45:00Z',
      updated_at: '2025-01-16T15:45:00Z',
    },
  ],
  '5': [
    {
      id: '18',
      courseId: '5',
      candidateName: 'Isabela Ferreira Lima',
      cpf: '357.159.486-00',
      email: 'isabela.ferreira@email.com',
      age: 27,
      phone: '(21) 19191-9191',
      enrollmentDate: '2025-01-18T10:20:00Z',
      status: 'confirmed',
      created_at: '2025-01-18T10:20:00Z',
      updated_at: '2025-01-19T16:15:00Z',
    },
    {
      id: '19',
      courseId: '5',
      candidateName: 'Matheus Costa Martins',
      cpf: '486.357.159-00',
      email: 'matheus.costa@email.com',
      age: 30,
      phone: '(21) 20202-0202',
      enrollmentDate: '2025-01-20T13:10:00Z',
      status: 'confirmed',
      created_at: '2025-01-20T13:10:00Z',
      updated_at: '2025-01-21T09:45:00Z',
    },
  ],
}

// Course vacancy information
export const courseVacancies: Record<string, number> = {
  '1': 25,
  '2': 15,
  '3': 20,
  '4': 30,
  '5': 12,
}

// Function to calculate enrollment summary for a course
export function calculateEnrollmentSummary(
  courseId: string
): EnrollmentSummary {
  const enrollments = mockEnrollments[courseId] || []
  const totalVacancies = courseVacancies[courseId] || 0

  const confirmedCount = enrollments.filter(
    e => e.status === 'confirmed'
  ).length
  const pendingCount = enrollments.filter(e => e.status === 'pending').length
  const cancelledCount = enrollments.filter(
    e => e.status === 'cancelled'
  ).length
  const waitlistCount = enrollments.filter(e => e.status === 'waitlist').length
  const remainingVacancies = Math.max(0, totalVacancies - confirmedCount)

  return {
    totalVacancies,
    confirmedCount,
    pendingCount,
    cancelledCount,
    waitlistCount,
    remainingVacancies,
  }
}

// Function to get enrollments for a course with pagination
export function getEnrollmentsForCourse(
  courseId: string,
  page = 1,
  perPage = 10,
  filters?: {
    status?: string[]
    search?: string
    dateRange?: { start: Date; end: Date }
    ageRange?: { min: number; max: number }
  }
): { enrollments: Enrollment[]; total: number } {
  let enrollments = mockEnrollments[courseId] || []

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    enrollments = enrollments.filter(e => filters.status!.includes(e.status))
  }

  if (filters?.search) {
    const searchTerm = filters.search.toLowerCase()
    enrollments = enrollments.filter(
      e =>
        e.candidateName.toLowerCase().includes(searchTerm) ||
        e.email.toLowerCase().includes(searchTerm) ||
        e.cpf.includes(searchTerm)
    )
  }

  if (filters?.dateRange) {
    enrollments = enrollments.filter(e => {
      const enrollmentDate = new Date(e.enrollmentDate)
      return (
        enrollmentDate >= filters.dateRange!.start &&
        enrollmentDate <= filters.dateRange!.end
      )
    })
  }

  if (filters?.ageRange) {
    enrollments = enrollments.filter(
      e => e.age >= filters.ageRange!.min && e.age <= filters.ageRange!.max
    )
  }

  const total = enrollments.length
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedEnrollments = enrollments.slice(startIndex, endIndex)

  return {
    enrollments: paginatedEnrollments,
    total,
  }
}

// Function to update enrollment status
export function updateEnrollmentStatus(
  courseId: string,
  enrollmentId: string,
  status: string,
  notes?: string
): Enrollment | null {
  const enrollments = mockEnrollments[courseId]
  if (!enrollments) return null

  const enrollmentIndex = enrollments.findIndex(e => e.id === enrollmentId)
  if (enrollmentIndex === -1) return null

  const updatedEnrollment = {
    ...enrollments[enrollmentIndex],
    status: status as any,
    notes: notes || enrollments[enrollmentIndex].notes,
    updated_at: new Date().toISOString(),
  } as Enrollment

  enrollments[enrollmentIndex] = updatedEnrollment
  return updatedEnrollment
}

// Function to add new enrollment
export function addEnrollment(
  courseId: string,
  enrollmentData: Omit<Enrollment, 'id' | 'created_at' | 'updated_at'>
): Enrollment {
  const enrollments = mockEnrollments[courseId] || []
  const newEnrollment = {
    ...enrollmentData,
    id: Math.random().toString(36).substr(2, 9),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Enrollment

  mockEnrollments[courseId] = [...enrollments, newEnrollment]
  return newEnrollment
}
