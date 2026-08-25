/** Extensions whose bytes are plain text, so the browser can read them without a parser. */
export const TEXT_EXTENSIONS = [
  '.txt',
  '.md',
  '.markdown',
  '.tex',
  '.csv',
  '.json',
  '.html',
  '.py',
  '.js',
  '.ts',
  '.java',
  '.c',
  '.cpp',
  '.sql',
  '.r',
]

const MAX_BYTES = 2_000_000

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export function unsupportedFileMessage(name: string): string | null {
  const extension = extensionOf(name)
  if (TEXT_EXTENSIONS.includes(extension)) return null
  if (extension === '.pdf' || extension === '.docx' || extension === '.doc' || extension === '.odt') {
    return `Los archivos ${extension} son binarios: ábrelos, copia el texto y pégalo aquí (o guárdalos como .txt).`
  }
  return `No puedo leer archivos ${extension || 'sin extensión'}. Usa texto plano (${TEXT_EXTENSIONS.slice(0, 4).join(', ')}) o pega el contenido.`
}

/** Reads a text file chosen by the user, rejecting formats we cannot decode. */
export async function readDocumentFile(file: File): Promise<string> {
  const unsupported = unsupportedFileMessage(file.name)
  if (unsupported) throw new Error(unsupported)
  if (file.size > MAX_BYTES) throw new Error('El archivo pesa más de 2 MB. Recorta el texto o divídelo.')
  const content = await file.text()
  if (content.trim().length === 0) throw new Error('El archivo está vacío.')
  return content
}
