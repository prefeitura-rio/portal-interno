/**
 * Department types based on RMI API structure
 */

export interface Department {
  cd_ua: string
  cd_ua_pai?: string
  id?: string
  nivel?: number
  nome_ua?: string
  ordem_absoluta?: string
  ordem_relativa?: string
  ordem_ua_basica?: string
  sigla_ua?: string
  updated_at?: string
}

export interface DepartmentListResponse {
  data: Department[]
  pagination?: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
  }
  total_count?: number
  success: boolean
}

export interface DepartmentResponse {
  data: Department
  success: boolean
}
