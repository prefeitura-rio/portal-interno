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
 * Known valid category IDs based on the current mapping.
 * This serves as a whitelist for categories that should be displayed.
 * IDs 8-22 are the current valid range for official categories.
 */
const VALID_CATEGORY_ID_RANGE = {
  min: 8,
  max: 22,
}

/**
 * Filters categories to remove duplicates and invalid entries.
 *
 * Strategy:
 * 1. Prioritize categories within the valid ID range (8-22)
 * 2. For categories within the range, keep only the first occurrence of each name
 * 3. Include categories with IDs > max range (future categories)
 * 4. Exclude categories with IDs < min range (legacy/duplicate entries)
 *
 * This ensures:
 * - Current valid categories (ID 8-22) are always included
 * - Duplicates within valid range are removed (keeps first occurrence by ID)
 * - New categories added by backend (ID > 22) will be automatically included
 * - Old/duplicate entries (ID < 8) are filtered out
 *
 * @param categorias - Array of categories from the API
 * @returns Filtered array of unique, valid categories
 */
export function filterValidCategorias(categorias: Categoria[]): Categoria[] {
  // Separate categories into different groups
  const validRangeCategories: Categoria[] = []
  const futureCategories: Categoria[] = []
  const seenNames = new Set<string>()

  // Sort by ID descending to prioritize higher IDs (more recent)
  const sortedCategorias = [...categorias].sort((a, b) => b.id - a.id)

  for (const categoria of sortedCategorias) {
    const { id, nome } = categoria

    // Include future categories (ID > max range) - these are new additions
    if (id > VALID_CATEGORY_ID_RANGE.max) {
      if (!seenNames.has(nome)) {
        futureCategories.push(categoria)
        seenNames.add(nome)
      }
      continue
    }

    // Skip legacy categories (ID < min range) - these are duplicates/old entries
    if (id < VALID_CATEGORY_ID_RANGE.min) {
      continue
    }

    // For valid range categories, keep only first occurrence of each name
    if (!seenNames.has(nome)) {
      validRangeCategories.push(categoria)
      seenNames.add(nome)
    }
  }

  // Combine and sort: valid range first (by ID desc), then future categories
  return [
    ...validRangeCategories.sort((a, b) => a.id - b.id),
    ...futureCategories.sort((a, b) => a.id - b.id),
  ]
}

/**
 * Validates if a category ID is within the acceptable range.
 * Accepts IDs >= minimum valid ID (8) to allow both current and future categories.
 *
 * @param id - Category ID to validate
 * @returns true if ID is valid (current or future category)
 */
export function isValidCategoriaId(id: number): boolean {
  return id >= VALID_CATEGORY_ID_RANGE.min
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
  return categorias.find(
    cat => cat.nome.toLowerCase() === nome.toLowerCase()
  )
}
