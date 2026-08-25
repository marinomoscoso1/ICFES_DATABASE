import type { ChatFn, ChatMessage } from './groq'
import { parseJsonObject } from './review'

export type AreaId =
  | 'lectura-critica'
  | 'matematicas'
  | 'sociales-ciudadanas'
  | 'biologia'
  | 'quimica'
  | 'fisica'

export type Difficulty = 'facil' | 'media' | 'dificil'

export type OptionId = 'A' | 'B' | 'C' | 'D'

export const OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D']

export interface Area {
  id: AreaId
  label: string
  /** What the ICFES actually evaluates in this area, fed to the generator. */
  focus: string
}

/** Saber 11 areas, minus inglés. Ciencias naturales is split into its three subáreas. */
export const AREAS: Area[] = [
  {
    id: 'lectura-critica',
    label: 'Lectura crítica',
    focus:
      'comprensión e interpretación de un texto (continuo o discontinuo: fragmento literario, columna de opinión, infografía descrita, caricatura descrita); competencias: identificar información explícita, comprender la organización del texto y reflexionar sobre intención, punto de vista y validez de los argumentos',
  },
  {
    id: 'matematicas',
    label: 'Matemáticas',
    focus:
      'razonamiento cuantitativo con contextos reales (finanzas personales, deportes, salud, ocupacional); competencias: interpretación y representación (tablas, gráficas), formulación y ejecución (proporciones, porcentajes, funciones, geometría, probabilidad, estadística) y argumentación',
  },
  {
    id: 'sociales-ciudadanas',
    label: 'Sociales y ciudadanas',
    focus:
      'Constitución Política de Colombia, mecanismos de participación, ramas del poder, derechos humanos, historia y geografía de Colombia y América Latina, conflicto y convivencia; competencias: pensamiento social, interpretación de perspectivas y pensamiento reflexivo y sistémico',
  },
  {
    id: 'biologia',
    label: 'Ciencias naturales · Biología',
    focus:
      'célula, genética y herencia, evolución, homeostasis, sistemas del cuerpo humano, ecosistemas y ciclos biogeoquímicos; competencias: uso comprensivo del conocimiento científico, explicación de fenómenos e indagación (leer un experimento o una gráfica de datos)',
  },
  {
    id: 'quimica',
    label: 'Ciencias naturales · Química',
    focus:
      'estructura atómica, tabla periódica, enlaces, estequiometría, soluciones y concentración, ácidos y bases, gases y reacciones químicas; competencias: uso comprensivo del conocimiento científico, explicación de fenómenos e indagación',
  },
  {
    id: 'fisica',
    label: 'Ciencias naturales · Física',
    focus:
      'cinemática, dinámica y leyes de Newton, trabajo y energía, conservación del momento, ondas y sonido, óptica, electricidad y magnetismo, termodinámica; competencias: uso comprensivo del conocimiento científico, explicación de fenómenos e indagación',
  },
]

export const areaById = (id: AreaId): Area => AREAS.find((area) => area.id === id) ?? AREAS[0]

export const DIFFICULTIES: { id: Difficulty; label: string; guide: string }[] = [
  {
    id: 'facil',
    label: 'Fácil',
    guide:
      'nivel 1-2 del ICFES: un solo paso de razonamiento, información casi explícita en el enunciado, distractores claramente descartables',
  },
  {
    id: 'media',
    label: 'Media',
    guide:
      'nivel 3 del ICFES: dos o tres pasos de razonamiento, exige relacionar el contexto con un concepto del área, distractores que corresponden a errores comunes',
  },
  {
    id: 'dificil',
    label: 'Difícil',
    guide:
      'nivel 4 del ICFES: varios pasos encadenados, exige transferir el concepto a una situación nueva, distractores que solo se descartan razonando bien',
  },
]

export const difficultyLabel = (id: Difficulty): string =>
  DIFFICULTIES.find((difficulty) => difficulty.id === id)?.label ?? id

export interface Option {
  id: OptionId
  text: string
}

export interface Question {
  id: string
  area: AreaId
  difficulty: Difficulty
  /** Texto, tabla o situación previa a la pregunta. Puede venir vacío. */
  context: string
  prompt: string
  options: Option[]
  answer: OptionId
  /** Competencia o componente que la pregunta evalúa. */
  competency: string
}

export interface Explanation {
  /** Reasoning chain in "me dicen X → sé Y → entonces hago Z" form. */
  steps: string[]
  keyIdea: string
  /** Why the option the student picked fails; empty when the answer was right. */
  whyWrong: string
  takeaway: string
}

export const MIN_QUESTIONS = 1
export const MAX_QUESTIONS = 20

const QUESTION_SHAPE =
  '{"contexto":"texto base o situación, puede ir vacío","enunciado":"la pregunta","opciones":{"A":"...","B":"...","C":"...","D":"..."},"respuesta":"A"|"B"|"C"|"D","competencia":"competencia o componente evaluado"}'

const generatorSystem = (area: Area, difficulty: Difficulty): string => {
  const guide = DIFFICULTIES.find((entry) => entry.id === difficulty)?.guide ?? ''
  return [
    'Eres un constructor de ítems del ICFES (examen Saber 11 de Colombia) y escribes preguntas indistinguibles de las oficiales.',
    `Área: ${area.label}. Evalúa ${area.focus}.`,
    `Dificultad: ${guide}.`,
    'Formato oficial: una situación o texto base breve, una pregunta y exactamente cuatro opciones A, B, C y D con una sola correcta.',
    'Los distractores deben ser plausibles y venir de errores de razonamiento reales, nunca absurdos ni de distinta longitud sospechosa.',
    'Nada de "todas las anteriores", "ninguna de las anteriores" ni pistas en la redacción sobre cuál es la correcta.',
    'Contexto colombiano y unidades del sistema internacional. Todo en español.',
    'No uses imágenes: si necesitas una gráfica o tabla, descríbela en texto o escríbela como tabla de markdown.',
    `Responde SOLO con JSON válido: {"preguntas":[${QUESTION_SHAPE}]}`,
  ].join(' ')
}

const explainerSystem = [
  'Eres un tutor del ICFES que reconstruye el razonamiento que el estudiante debió seguir para resolver la pregunta.',
  'Escribe la cadena de pensamiento paso a paso, cada paso en el formato "Me dicen ... → sé ... → entonces ...".',
  'Cada paso debe ser una inferencia real y verificable a partir del enunciado, no un resumen vago.',
  'Si el estudiante se equivocó, explica exactamente en qué paso se rompe su opción.',
  'Responde SOLO con JSON válido:',
  '{"pasos":["Me dicen ... → sé ... → entonces ..."],"idea_clave":"el concepto que resuelve la pregunta","por_que_falla":"por qué la opción elegida es incorrecta, vacío si acertó","para_recordar":"regla corta que sirve en preguntas parecidas"}',
  'Máximo 5 pasos. Español, sin relleno.',
].join(' ')

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const asOptionId = (value: unknown): OptionId | null => {
  const raw = text(value).toUpperCase().replace(/[^A-D]/g, '')
  const first = raw.charAt(0)
  return OPTION_IDS.includes(first as OptionId) ? (first as OptionId) : null
}

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(text).filter((entry) => entry !== '') : []

/**
 * Turns one raw item into a Question, or null when the model broke the format
 * (missing option, duplicated options, answer outside A-D...).
 */
export function toQuestion(
  raw: unknown,
  area: AreaId,
  difficulty: Difficulty,
  id: string,
): Question | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const prompt = text(record.enunciado)
  const answer = asOptionId(record.respuesta)
  const rawOptions = record.opciones

  if (prompt === '' || answer === null || typeof rawOptions !== 'object' || rawOptions === null) {
    return null
  }

  const optionRecord = rawOptions as Record<string, unknown>
  const options: Option[] = []
  for (const optionId of OPTION_IDS) {
    const value = text(optionRecord[optionId] ?? optionRecord[optionId.toLowerCase()])
    if (value === '') return null
    options.push({ id: optionId, text: value })
  }

  const unique = new Set(options.map((option) => option.text.toLowerCase()))
  if (unique.size !== OPTION_IDS.length) return null

  return {
    id,
    area,
    difficulty,
    context: text(record.contexto),
    prompt,
    options,
    answer,
    competency: text(record.competencia),
  }
}

export function parseQuestions(
  raw: string,
  area: AreaId,
  difficulty: Difficulty,
  makeId: () => string,
): Question[] {
  const parsed = parseJsonObject(raw)
  const list = parsed === null ? null : parsed.preguntas
  if (!Array.isArray(list)) return []
  return list
    .map((item) => toQuestion(item, area, difficulty, makeId()))
    .filter((question): question is Question => question !== null)
}

/** Spreads the requested count over the chosen areas, round robin. */
export function distribute(areas: AreaId[], count: number): { area: AreaId; count: number }[] {
  if (areas.length === 0 || count <= 0) return []
  const plan = areas.map((area) => ({ area, count: 0 }))
  for (let index = 0; index < count; index += 1) plan[index % plan.length].count += 1
  return plan.filter((entry) => entry.count > 0)
}

export interface GenerateInput {
  areas: AreaId[]
  difficulty: Difficulty
  count: number
  chat: ChatFn
  apiKey: string
  model: string
  makeId: () => string
  /** Called as each area's questions arrive, so the UI can fill in progressively. */
  onQuestions?: (questions: Question[]) => void
  signal?: AbortSignal
}

/**
 * Generates a mixed test: one call per selected area (models drift when asked to
 * juggle several areas at once), keeping the round-robin order of the plan.
 */
export async function generateTest(input: GenerateInput): Promise<Question[]> {
  if (input.areas.length === 0) throw new Error('Elige al menos un área.')

  const count = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.round(input.count)))
  const questions: Question[] = []

  for (const slot of distribute(input.areas, count)) {
    const area = areaById(slot.area)
    const messages: ChatMessage[] = [
      { role: 'system', content: generatorSystem(area, input.difficulty) },
      {
        role: 'user',
        content: [
          `Escribe ${slot.count} pregunta(s) de ${area.label} con dificultad ${difficultyLabel(input.difficulty)}.`,
          'Varía el contexto y el componente evaluado entre preguntas.',
          questions.length > 0
            ? `No repitas estos enunciados ya usados:\n${questions.map((question) => `- ${question.prompt}`).join('\n')}`
            : '',
        ]
          .filter((part) => part !== '')
          .join('\n\n'),
      },
    ]
    const raw = await input.chat({
      apiKey: input.apiKey,
      model: input.model,
      messages,
      temperature: 0.9,
      signal: input.signal,
    })
    const parsed = parseQuestions(raw, slot.area, input.difficulty, input.makeId)
    if (parsed.length > 0) {
      questions.push(...parsed)
      input.onQuestions?.(parsed)
    }
  }

  if (questions.length === 0) {
    throw new Error('El modelo no devolvió preguntas usables. Intenta de nuevo o cambia de modelo.')
  }
  return questions
}

export interface ExplainInput {
  question: Question
  /** What the student answered; null when they skipped it. */
  chosen: OptionId | null
  chat: ChatFn
  apiKey: string
  model: string
  signal?: AbortSignal
}

const questionBlock = (question: Question): string =>
  [
    `ÁREA: ${areaById(question.area).label}`,
    question.context === '' ? '' : `CONTEXTO:\n${question.context}`,
    `PREGUNTA:\n${question.prompt}`,
    `OPCIONES:\n${question.options.map((option) => `${option.id}. ${option.text}`).join('\n')}`,
    `RESPUESTA CORRECTA: ${question.answer}`,
  ]
    .filter((part) => part !== '')
    .join('\n\n')

/** Asks the model for the reasoning chain the student should have followed. */
export async function explainQuestion(input: ExplainInput): Promise<Explanation> {
  const { question, chosen } = input
  const messages: ChatMessage[] = [
    { role: 'system', content: explainerSystem },
    {
      role: 'user',
      content: [
        questionBlock(question),
        chosen === null
          ? 'El estudiante no respondió: muéstrale el camino completo.'
          : chosen === question.answer
            ? `El estudiante respondió ${chosen} y acertó: confirma el camino correcto y deja "por_que_falla" vacío.`
            : `El estudiante respondió ${chosen} y falló: explica dónde se rompe ese razonamiento.`,
      ].join('\n\n'),
    },
  ]

  const raw = await input.chat({
    apiKey: input.apiKey,
    model: input.model,
    messages,
    temperature: 0.2,
    signal: input.signal,
  })

  const parsed = parseJsonObject(raw)
  if (!parsed) {
    return { steps: [], keyIdea: '', whyWrong: '', takeaway: raw.trim().slice(0, 600) }
  }
  return {
    steps: asStringList(parsed.pasos),
    keyIdea: text(parsed.idea_clave),
    whyWrong: text(parsed.por_que_falla),
    takeaway: text(parsed.para_recordar),
  }
}

export interface Score {
  answered: number
  correct: number
  total: number
  /** 0-100, ICFES-style percentage of correct answers over the whole test. */
  percentage: number
}

export function scoreTest(questions: Question[], answers: Record<string, OptionId>): Score {
  const answered = questions.filter((question) => answers[question.id] !== undefined).length
  const correct = questions.filter((question) => answers[question.id] === question.answer).length
  return {
    answered,
    correct,
    total: questions.length,
    percentage: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100),
  }
}
