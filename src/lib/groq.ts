export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  signal?: AbortSignal
}

/** Chat completion function, injectable so the debate can be tested without network. */
export type ChatFn = (request: ChatRequest) => Promise<string>

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

/** Free-tier Groq models that follow instructions well enough to debate. */
export const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
] as const

export class GroqError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GroqError'
    this.status = status
  }
}

const errorMessage = (status: number, body: string): string => {
  if (status === 401) return 'La API key de Groq no es válida.'
  if (status === 429) return 'Groq está limitando las peticiones (rate limit). Espera unos segundos.'
  if (status === 413) return 'El documento es demasiado largo para este modelo.'
  return `Groq respondió ${status}: ${body.slice(0, 200)}`
}

export const groqChat: ChatFn = async ({ apiKey, model, messages, temperature = 0.4, signal }) => {
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
    signal,
  })

  if (!response.ok) {
    throw new GroqError(errorMessage(response.status, await response.text()), response.status)
  }

  const payload: unknown = await response.json()
  const content = readContent(payload)
  if (content === null) throw new GroqError('Groq devolvió una respuesta vacía.')
  return content
}

function readContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const message = (choices[0] as { message?: { content?: unknown } }).message
  const content = message?.content
  return typeof content === 'string' && content.trim().length > 0 ? content : null
}
