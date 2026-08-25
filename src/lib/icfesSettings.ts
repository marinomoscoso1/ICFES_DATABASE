import { AREAS, MAX_QUESTIONS, MIN_QUESTIONS } from './icfes'
import type { AreaId, Difficulty } from './icfes'

export interface IcfesSettings {
  areas: AreaId[]
  difficulty: Difficulty
  count: number
}

export const ICFES_SETTINGS_KEY = 'icfes-practice:v1'

export const defaultIcfesSettings = (): IcfesSettings => ({
  areas: ['lectura-critica', 'matematicas'],
  difficulty: 'media',
  count: 5,
})

const DIFFICULTY_IDS: Difficulty[] = ['facil', 'media', 'dificil']
const AREA_IDS = AREAS.map((area) => area.id)

export function parseIcfesSettings(raw: string | null): IcfesSettings | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    const fallback = defaultIcfesSettings()
    const areas = Array.isArray(record.areas)
      ? record.areas.filter((area): area is AreaId => AREA_IDS.includes(area as AreaId))
      : []
    const difficulty = DIFFICULTY_IDS.find((entry) => entry === record.difficulty)
    const count = Number(record.count)
    return {
      areas: areas.length > 0 ? areas : fallback.areas,
      difficulty: difficulty ?? fallback.difficulty,
      count: Number.isFinite(count)
        ? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.round(count)))
        : fallback.count,
    }
  } catch {
    return null
  }
}

export function loadIcfesSettings(): IcfesSettings {
  try {
    return parseIcfesSettings(localStorage.getItem(ICFES_SETTINGS_KEY)) ?? defaultIcfesSettings()
  } catch {
    return defaultIcfesSettings()
  }
}

export function saveIcfesSettings(settings: IcfesSettings): void {
  try {
    localStorage.setItem(ICFES_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* storage disabled: preferences last only for this session */
  }
}
