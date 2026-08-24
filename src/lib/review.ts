import type { ChatFn, ChatMessage } from './groq'

export type Stance = 'bien' | 'mal'
export type Role = 'tesis' | 'antitesis' | 'sintesis'

export interface DebateTurn {
  role: Role
  round: number
  /** Verdict this turn ends up defending: the debaters may concede. */
  stance: Stance
  /** 0 to 1, how sure the debater is of its own stance. */
  confidence: number
  summary: string
  points: string[]
}

export interface Verdict {
  stance: Stance
  /** 0 to 100, or null if the judge did not give one. */
  score: number | null
  /** True when both debaters landed on the same verdict before the judge stepped in. */
  agreed: boolean
  rounds: number
  summary: string
  strengths: string[]
  issues: string[]
  actions: string[]
}

export interface ReviewResult {
  turns: DebateTurn[]
  verdict: Verdict
}

export interface ReviewInput {
  /** Text of the taller / trabajo under review. */
  document: string
  /** Optional statement of what the assignment asked for. */
  brief?: string
  chat: ChatFn
  apiKey: string
  /** Model defending that the work is good. */
  thesisModel: string
  /** Model attacking the work. */
  antithesisModel: string
  /** Model that writes the final verdict. */
  judgeModel?: string
  maxRounds?: number
  onTurn?: (turn: DebateTurn) => void
  signal?: AbortSignal
}

export const DEFAULT_MAX_ROUNDS = 3
const MAX_DOCUMENT_CHARS = 24000

/** Without this the debaters grade like a hostile professor and nothing ever passes. */
const CALIBRATION =
  'Calibración: "bien" significa que el trabajo cumple la consigna con calidad aceptable aunque tenga mejoras pendientes (equivale a 70/100 o más); "mal" se reserva para trabajos que incumplen la consigna o tienen fallas graves. No exijas perfección.'

const JSON_SHAPE = `{"veredicto":"bien"|"mal","confianza":0-1,"resumen":"una frase","puntos":["argumento concreto citando el trabajo"]}`

const debaterSystem = (role: Exclude<Role, 'sintesis'>): string => {
  const stance =
    role === 'tesis'
      ? 'Tu tesis inicial es que el trabajo QUEDÓ BIEN y cumple con lo pedido.'
      : 'Tu antítesis inicial es que el trabajo QUEDÓ MAL y no cumple con lo pedido.'
  return [
    `Eres el revisor "${role}" en un debate académico sobre un taller o trabajo escolar/universitario.`,
    stance,
    'Defiende tu postura con evidencia concreta del texto (cita fragmentos cortos), no con generalidades.',
    'Sé honesto: si los argumentos del otro revisor son decisivos, cambia tu veredicto en lugar de insistir.',
    'Evalúa: cumplimiento de la consigna, exactitud del contenido, estructura, profundidad, citas y redacción.',
    CALIBRATION,
    `Responde SOLO con JSON válido con esta forma: ${JSON_SHAPE}`,
    'Máximo 4 puntos, cada uno de una o dos frases, en español.',
  ].join(' ')
}

const judgeSystem = [
  'Eres el juez de un debate entre dos revisores sobre un taller o trabajo académico.',
  'Sintetiza el debate y entrega el veredicto final sobre si el trabajo quedó bien o mal.',
  'Si ambos revisores coincidieron, respeta ese consenso y explica por qué es sólido.',
  CALIBRATION,
  'El veredicto y el puntaje deben ser coherentes: puntaje >= 70 implica "bien".',
  'Responde SOLO con JSON válido con esta forma:',
  '{"veredicto":"bien"|"mal","puntaje":0-100,"resumen":"2 o 3 frases","fortalezas":["..."],"problemas":["..."],"acciones":["mejora accionable"]}',
  'Escribe en español, sin relleno.',
].join(' ')

const documentBlock = (input: Pick<ReviewInput, 'document' | 'brief'>): string => {
  const document = input.document.trim().slice(0, MAX_DOCUMENT_CHARS)
  const brief = input.brief?.trim()
  return [
    brief ? `CONSIGNA DEL TRABAJO:\n${brief}` : 'CONSIGNA DEL TRABAJO: no fue entregada, dedúcela del texto.',
    `TRABAJO A REVISAR:\n${document}`,
  ].join('\n\n')
}

const transcript = (turns: DebateTurn[]): string =>
  turns
    .map(
      (turn) =>
        `[${turn.role} · ronda ${turn.round} · veredicto ${turn.stance}]\n${turn.summary}\n${turn.points
          .map((point) => `- ${point}`)
          .join('\n')}`,
    )
    .join('\n\n')

/** Models often wrap JSON in prose or code fences; keep the outermost object. */
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const withoutFences = raw.replace(/```(?:json)?/gi, '').trim()
  const start = withoutFences.indexOf('{')
  const end = withoutFences.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(withoutFences.slice(start, end + 1))
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const asStance = (value: unknown, fallback: Stance): Stance => {
  if (typeof value !== 'string') return fallback
  const normalized = value.toLowerCase()
  if (normalized.includes('mal')) return 'mal'
  if (normalized.includes('bien')) return 'bien'
  return fallback
}

const asStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : []

const asText = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback

const asConfidence = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return 0.5
  return Math.min(1, Math.max(0, numeric > 1 ? numeric / 100 : numeric))
}

const asScore = (value: unknown): number | null => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.round(Math.min(100, Math.max(0, numeric)))
}

function toTurn(raw: string, role: Exclude<Role, 'sintesis'>, round: number): DebateTurn {
  const parsed = parseJsonObject(raw)
  const fallbackStance: Stance = role === 'tesis' ? 'bien' : 'mal'
  if (!parsed) {
    return {
      role,
      round,
      stance: fallbackStance,
      confidence: 0.5,
      summary: raw.trim().slice(0, 400),
      points: [],
    }
  }
  return {
    role,
    round,
    stance: asStance(parsed.veredicto, fallbackStance),
    confidence: asConfidence(parsed.confianza),
    summary: asText(parsed.resumen, 'Sin resumen.'),
    points: asStringList(parsed.puntos),
  }
}

async function speak(
  input: ReviewInput,
  role: Exclude<Role, 'sintesis'>,
  round: number,
  turns: DebateTurn[],
): Promise<DebateTurn> {
  const history = turns.length > 0 ? `\n\nDEBATE HASTA AHORA:\n${transcript(turns)}` : ''
  const instruction =
    turns.length === 0
      ? 'Abre el debate con tu postura.'
      : 'Responde a los argumentos del otro revisor: refútalos o concede lo que sea justo.'
  const messages: ChatMessage[] = [
    { role: 'system', content: debaterSystem(role) },
    { role: 'user', content: `${documentBlock(input)}${history}\n\n${instruction}` },
  ]
  const raw = await input.chat({
    apiKey: input.apiKey,
    model: role === 'tesis' ? input.thesisModel : input.antithesisModel,
    messages,
    temperature: 0.5,
    signal: input.signal,
  })
  const turn = toTurn(raw, role, round)
  input.onTurn?.(turn)
  return turn
}

function fallbackVerdict(turns: DebateTurn[], agreed: boolean, rounds: number): Verdict {
  const last = turns[turns.length - 1]
  return {
    stance: agreed && last ? last.stance : 'mal',
    score: null,
    agreed,
    rounds,
    summary: agreed
      ? 'Los revisores coincidieron, pero el juez no devolvió un informe legible.'
      : 'El juez no devolvió un informe legible; revisa los argumentos del debate.',
    strengths: turns.filter((turn) => turn.stance === 'bien').flatMap((turn) => turn.points),
    issues: turns.filter((turn) => turn.stance === 'mal').flatMap((turn) => turn.points),
    actions: [],
  }
}

async function judge(input: ReviewInput, turns: DebateTurn[], agreed: boolean, rounds: number): Promise<Verdict> {
  const messages: ChatMessage[] = [
    { role: 'system', content: judgeSystem },
    {
      role: 'user',
      content: [
        documentBlock(input),
        `DEBATE:\n${transcript(turns)}`,
        agreed
          ? 'Los dos revisores llegaron al mismo veredicto.'
          : `No hubo consenso tras ${rounds} rondas: decide tú.`,
      ].join('\n\n'),
    },
  ]
  const raw = await input.chat({
    apiKey: input.apiKey,
    model: input.judgeModel ?? input.thesisModel,
    messages,
    temperature: 0.2,
    signal: input.signal,
  })
  const parsed = parseJsonObject(raw)
  if (!parsed) return fallbackVerdict(turns, agreed, rounds)
  const consensusStance = turns[turns.length - 1]?.stance ?? 'mal'
  return {
    stance: asStance(parsed.veredicto, agreed ? consensusStance : 'mal'),
    score: asScore(parsed.puntaje),
    agreed,
    rounds,
    summary: asText(parsed.resumen, 'Sin resumen.'),
    strengths: asStringList(parsed.fortalezas),
    issues: asStringList(parsed.problemas),
    actions: asStringList(parsed.acciones),
  }
}

/**
 * Runs the tesis/antítesis debate: the two debaters alternate until they land on the
 * same verdict (or rounds run out), then a judge writes the final report.
 */
export async function runReview(input: ReviewInput): Promise<ReviewResult> {
  if (input.document.trim().length === 0) {
    throw new Error('No hay texto que revisar.')
  }
  const maxRounds = Math.max(1, input.maxRounds ?? DEFAULT_MAX_ROUNDS)
  const turns: DebateTurn[] = []
  let agreed = false
  let round = 0

  while (round < maxRounds && !agreed) {
    round += 1
    turns.push(await speak(input, 'tesis', round, turns))
    turns.push(await speak(input, 'antitesis', round, turns))
    const thesisTurn = turns[turns.length - 2]
    const antithesisTurn = turns[turns.length - 1]
    agreed = thesisTurn.stance === antithesisTurn.stance
  }

  const verdict = await judge(input, turns, agreed, round)
  input.onTurn?.({
    role: 'sintesis',
    round,
    stance: verdict.stance,
    confidence: verdict.score === null ? 0.5 : verdict.score / 100,
    summary: verdict.summary,
    points: verdict.actions,
  })
  return { turns, verdict }
}

export interface FollowUpInput {
  question: string
  document: string
  brief?: string
  turns: DebateTurn[]
  verdict: Verdict
  history: ChatMessage[]
  chat: ChatFn
  apiKey: string
  model: string
  signal?: AbortSignal
}

/** Answers a normal chat question with the debate and verdict as context. */
export async function answerFollowUp(input: FollowUpInput): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        'Eres un tutor académico que ya revisó el trabajo del estudiante mediante un debate tesis-antítesis.',
        'Responde en español, breve y concreto, apoyándote en el veredicto y en el texto del trabajo.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        documentBlock({ document: input.document, brief: input.brief }),
        `DEBATE:\n${transcript(input.turns)}`,
        `VEREDICTO: ${input.verdict.stance}${input.verdict.score === null ? '' : ` (${input.verdict.score}/100)`} — ${input.verdict.summary}`,
      ].join('\n\n'),
    },
    ...input.history,
    { role: 'user', content: input.question },
  ]
  return input.chat({
    apiKey: input.apiKey,
    model: input.model,
    messages,
    temperature: 0.3,
    signal: input.signal,
  })
}
