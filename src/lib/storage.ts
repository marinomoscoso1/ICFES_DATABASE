import type { AppState, Course, GradeItem } from '../types'

export const STORAGE_KEY = 'grade-calculator:v1'

export const createId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const createItem = (name = '', weight = 0): GradeItem => ({
  id: createId(),
  name,
  weight,
  score: null,
})

export const createCourse = (name = 'Nueva materia'): Course => ({
  id: createId(),
  name,
  maxScore: 5,
  targetScore: 3,
  items: [createItem('Parcial', 30), createItem('Talleres', 30), createItem('Examen final', 40)],
})

export function defaultState(): AppState {
  const course = createCourse('Mi materia')
  return { courses: [course], activeCourseId: course.id }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function parseItem(raw: unknown): GradeItem | null {
  if (!isRecord(raw)) return null
  const score = raw.score
  return {
    id: typeof raw.id === 'string' ? raw.id : createId(),
    name: typeof raw.name === 'string' ? raw.name : '',
    weight: typeof raw.weight === 'number' && Number.isFinite(raw.weight) ? raw.weight : 0,
    score: typeof score === 'number' && Number.isFinite(score) ? score : null,
  }
}

function parseCourse(raw: unknown): Course | null {
  if (!isRecord(raw)) return null
  const items = Array.isArray(raw.items)
    ? raw.items.map(parseItem).filter((item): item is GradeItem => item !== null)
    : []
  return {
    id: typeof raw.id === 'string' ? raw.id : createId(),
    name: typeof raw.name === 'string' ? raw.name : 'Materia',
    maxScore: typeof raw.maxScore === 'number' && raw.maxScore > 0 ? raw.maxScore : 5,
    targetScore: typeof raw.targetScore === 'number' ? raw.targetScore : 3,
    items,
  }
}

export function parseState(raw: string | null): AppState | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !Array.isArray(parsed.courses)) return null
    const courses = parsed.courses
      .map(parseCourse)
      .filter((course): course is Course => course !== null)
    if (courses.length === 0) return null
    const activeCourseId =
      typeof parsed.activeCourseId === 'string' &&
      courses.some((course) => course.id === parsed.activeCourseId)
        ? parsed.activeCourseId
        : courses[0].id
    return { courses, activeCourseId }
  } catch {
    return null
  }
}

export function loadState(): AppState {
  try {
    return parseState(localStorage.getItem(STORAGE_KEY)) ?? defaultState()
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage disabled or full: the app keeps working in memory */
  }
}
