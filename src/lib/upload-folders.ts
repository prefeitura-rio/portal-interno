/**
 * Pastas permitidas para upload de imagens no GCS via /api/upload/signed-url.
 * O cliente envia só a chave; o caminho real é resolvido no servidor.
 */
export const UPLOAD_FOLDERS = {
  courses: 'superapp/images/courses',
  empresas: 'superapp/images/empresas',
} as const

export type UploadFolder = keyof typeof UPLOAD_FOLDERS

export const DEFAULT_UPLOAD_FOLDER: UploadFolder = 'courses'

export function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === 'string' && Object.hasOwn(UPLOAD_FOLDERS, value)
}
