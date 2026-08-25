import { buildApiKey } from './gate'
import { DEFAULT_MAX_ROUNDS } from './review'

export interface ReviewSettings {
  apiKey: string
  thesisModel: string
  antithesisModel: string
  judgeModel: string
  maxRounds: number
}

export const SETTINGS_KEY = 'thesis-reviewer:v1'

export const defaultSettings = (): ReviewSettings => ({
  // Deployments can bake a key in at build time so nobody has to paste one.
  apiKey: buildApiKey(),
  thesisModel: 'openai/gpt-oss-120b',
  antithesisModel: 'qwen/qwen3.6-27b',
  judgeModel: 'openai/gpt-oss-120b',
  maxRounds: DEFAULT_MAX_ROUNDS,
})

/** Models Groq retired: settings saved with them would only get 404s. */
const RETIRED_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b']

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 && !RETIRED_MODELS.includes(value)
    ? value
    : fallback

export function parseSettings(raw: string | null): ReviewSettings | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    const fallback = defaultSettings()
    const rounds = Number(record.maxRounds)
    return {
      apiKey: text(record.apiKey, fallback.apiKey),
      thesisModel: text(record.thesisModel, fallback.thesisModel),
      antithesisModel: text(record.antithesisModel, fallback.antithesisModel),
      judgeModel: text(record.judgeModel, fallback.judgeModel),
      maxRounds: Number.isFinite(rounds) ? Math.min(6, Math.max(1, Math.round(rounds))) : fallback.maxRounds,
    }
  } catch {
    return null
  }
}

export function loadSettings(): ReviewSettings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY)) ?? defaultSettings()
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: ReviewSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* storage disabled: the key lives only in memory for this session */
  }
}
