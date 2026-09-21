/**
 * Calcula a idade em anos a partir de uma data de nascimento ISO.
 * Retorna null se a data for inválida ou a idade estiver fora de 0–150.
 */
export function calcAgeFromBirthDate(iso: string): number | null {
  try {
    const birthDate = new Date(iso)
    if (Number.isNaN(birthDate.getTime())) {
      return null
    }

    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--
    }

    if (age >= 0 && age <= 150) {
      return age
    }
    return null
  } catch {
    return null
  }
}

/** Retorna "X anos" ou undefined quando a data está ausente/inválida. */
export function formatAgeLabel(iso?: string): string | undefined {
  if (!iso) return undefined
  const age = calcAgeFromBirthDate(iso)
  return age !== null ? `${age} anos` : undefined
}
