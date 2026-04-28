/**
 * Normalize string by removing accents and converting to lowercase
 * This helps with CSV encoding issues where accents may be incorrectly interpreted
 *
 * Handles common Brazilian Portuguese characters:
 * - á, à, â, ã, ä → a
 * - é, è, ê, ë → e
 * - í, ì, î, ï → i
 * - ó, ò, ô, õ, ö → o
 * - ú, ù, û, ü → u
 * - ç → c
 * - ñ → n
 *
 * Also fixes corrupted Windows-1252 to UTF-8 encoding issues
 * (e.g., "ObrigatÃ³rio" → "Obrigatorio")
 */
export function normalizeString(str: string): string {
  // FIRST: Fix corrupted encoding patterns BEFORE lowercasing
  // "ObrigatÃ³rio" is a common corruption of "Obrigatório" in Windows-1252 to UTF-8
  let normalized = str
    .replace(/Ã³/g, 'ó')  // Fix corrupted ó (uppercase)
    .replace(/ã³/g, 'ó')  // Fix corrupted ó (lowercase)
    .replace(/Ã¡/g, 'á')  // Fix corrupted á
    .replace(/ã¡/g, 'á')
    .replace(/Ã¢/g, 'â')  // Fix corrupted â
    .replace(/ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')  // Fix corrupted ã
    .replace(/ã£/g, 'ã')
    .replace(/Ã©/g, 'é')  // Fix corrupted é
    .replace(/ã©/g, 'é')
    .replace(/Ãª/g, 'ê')  // Fix corrupted ê
    .replace(/ãª/g, 'ê')
    .replace(/Ã­/g, 'í')  // Fix corrupted í
    .replace(/ã­/g, 'í')
    .replace(/Ãº/g, 'ú')  // Fix corrupted ú
    .replace(/ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')  // Fix corrupted ç
    .replace(/ã§/g, 'ç')
    .replace(/Ãµ/g, 'õ')  // Fix corrupted õ
    .replace(/ãµ/g, 'õ')

  // SECOND: Convert to lowercase
  normalized = normalized.toLowerCase().trim()

  // THIRD: Normalize to remove accents
  normalized = normalized
    .normalize('NFD')
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: Unicode range for combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    // Handle any remaining special characters
    .replace(/[ãÃ]/g, 'a')
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')

  return normalized
}
