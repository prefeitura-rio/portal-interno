/**
 * Utility functions for category management
 */

export interface Categoria {
  id: number
  nome: string
}

/**
 * In-memory cache for categories
 * Categories don't change often, so we cache them for 10 minutes
 */
interface CategoriaCache {
  data: Categoria[]
  timestamp: number
}

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes in milliseconds
let categoriaCache: CategoriaCache | null = null

/**
 * Get cached categories if still valid
 */
export function getCachedCategorias(): Categoria[] | null {
  if (!categoriaCache) return null

  const now = Date.now()
  const isExpired = now - categoriaCache.timestamp > CACHE_TTL

  if (isExpired) {
    categoriaCache = null
    return null
  }

  return categoriaCache.data
}

/**
 * Set categories in cache
 */
export function setCachedCategorias(categorias: Categoria[]): void {
  categoriaCache = {
    data: categorias,
    timestamp: Date.now(),
  }
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearCategoriaCache(): void {
  categoriaCache = null
}

/**
 * Filters categories to remove duplicates.
 *
 * Strategy:
 * - Keep only the first occurrence of each category name (by highest ID)
 * - Sort result by ID ascending
 *
 * @param categorias - Array of categories from the API
 * @returns Filtered array of unique categories
 */
export function filterValidCategorias(categorias: Categoria[]): Categoria[] {
  const seenNames = new Set<string>()
  const uniqueCategories: Categoria[] = []

  // Sort by ID descending to prioritize higher IDs (more recent)
  const sortedCategorias = [...categorias].sort((a, b) => b.id - a.id)

  for (const categoria of sortedCategorias) {
    const { nome } = categoria

    // Keep only first occurrence of each name
    if (!seenNames.has(nome)) {
      uniqueCategories.push(categoria)
      seenNames.add(nome)
    }
  }

  // Sort by ID ascending for final result
  return uniqueCategories.sort((a, b) => a.id - b.id)
}

/**
 * Validates if a category ID is valid.
 *
 * @param id - Category ID to validate
 * @returns true if ID is a positive number
 */
export function isValidCategoriaId(id: number): boolean {
  return id > 0
}

/**
 * Gets a category by ID from a list of categories.
 *
 * @param categorias - Array of categories
 * @param id - Category ID to find
 * @returns Category object if found, undefined otherwise
 */
export function getCategoriaById(
  categorias: Categoria[],
  id: number
): Categoria | undefined {
  return categorias.find(cat => cat.id === id)
}

/**
 * Gets a category by name from a list of categories.
 * Case-insensitive search.
 *
 * @param categorias - Array of categories
 * @param nome - Category name to find
 * @returns Category object if found, undefined otherwise
 */
export function getCategoriaByNome(
  categorias: Categoria[],
  nome: string
): Categoria | undefined {
  return categorias.find(cat => cat.nome.toLowerCase() === nome.toLowerCase())
}
