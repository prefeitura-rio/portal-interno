/**
 * Imagens (capa e galeria) da oportunidade MEI.
 *
 * Uploads novos vão para a pasta `mei` do bucket configurado em
 * GCS_BUCKET_NAME (via /api/upload/signed-url) e voltam como
 * `https://storage.googleapis.com/<bucket>/superapp/images/mei/<uuid>.<ext>`.
 * Imagens antigas, de outro bucket do GCS (ex.: rj-escritorio-dev-public),
 * continuam válidas.
 */
export const MEI_IMAGE_URL_PREFIX = 'https://storage.googleapis.com/'

/** Vazio é aceito (rascunho e galeria opcional); preenchido precisa ser do GCS. */
export function isMEIImageURL(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return true
  try {
    new URL(url)
  } catch {
    return false
  }
  return url.startsWith(MEI_IMAGE_URL_PREFIX)
}
