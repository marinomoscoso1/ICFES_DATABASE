import { describe, expect, it, vi } from 'vitest'
import {
  AREAS,
  distribute,
  explainQuestion,
  generateTest,
  parseQuestions,
  scoreTest,
  toQuestion,
} from './icfes'
import type { OptionId, Question } from './icfes'
import { defaultIcfesSettings, parseIcfesSettings } from './icfesSettings'
import type { ChatRequest } from './groq'

const rawItem = (overrides: Record<string, unknown> = {}) => ({
  contexto: 'Un ciclista recorre 12 km en 30 minutos.',
  enunciado: '¿Cuál es su rapidez media?',
  opciones: { A: '24 km/h', B: '12 km/h', C: '6 km/h', D: '360 km/h' },
  respuesta: 'A',
  competencia: 'Formulación y ejecución',
  ...overrides,
})

const ids = () => {
  let count = 0
  return () => {
    count += 1
    return `q${count}`
  }
}

const question = (overrides: Partial<Question> = {}): Question => ({
  id: 'q1',
  area: 'fisica',
  difficulty: 'media',
  context: '',
  prompt: '¿Cuál es su rapidez media?',
  options: [
    { id: 'A', text: '24 km/h' },
    { id: 'B', text: '12 km/h' },
    { id: 'C', text: '6 km/h' },
    { id: 'D', text: '360 km/h' },
  ],
  answer: 'A',
  competency: '',
  ...overrides,
})

describe('toQuestion', () => {
  it('acepta un ítem bien formado', () => {
    const parsed = toQuestion(rawItem(), 'matematicas', 'media', 'q1')

    expect(parsed).not.toBeNull()
    expect(parsed?.options.map((option) => option.id)).toEqual(['A', 'B', 'C', 'D'])
    expect(parsed?.answer).toBe('A')
    expect(parsed?.area).toBe('matematicas')
  })

  it('normaliza respuestas como "Opción c)"', () => {
    expect(toQuestion(rawItem({ respuesta: 'Opción c)' }), 'fisica', 'facil', 'q1')?.answer).toBe('C')
  })

  it('descarta ítems con menos de cuatro opciones', () => {
    expect(
      toQuestion(rawItem({ opciones: { A: '1', B: '2', C: '3' } }), 'fisica', 'facil', 'q1'),
    ).toBeNull()
  })

  it('descarta ítems con opciones repetidas', () => {
    expect(
      toQuestion(
        rawItem({ opciones: { A: '24 km/h', B: '24 km/h', C: '6 km/h', D: '3 km/h' } }),
        'fisica',
        'facil',
        'q1',
      ),
    ).toBeNull()
  })

  it('descarta ítems cuya respuesta no está entre A y D', () => {
    expect(toQuestion(rawItem({ respuesta: 'E' }), 'fisica', 'facil', 'q1')).toBeNull()
  })
})

describe('parseQuestions', () => {
  it('lee el JSON aunque venga envuelto en fences y prosa', () => {
    const raw = `Claro, aquí van:\n\`\`\`json\n${JSON.stringify({ preguntas: [rawItem()] })}\n\`\`\``

    expect(parseQuestions(raw, 'matematicas', 'media', ids())).toHaveLength(1)
  })

  it('conserva las preguntas válidas y descarta las rotas', () => {
    const raw = JSON.stringify({ preguntas: [rawItem(), rawItem({ enunciado: '' })] })

    expect(parseQuestions(raw, 'matematicas', 'media', ids())).toHaveLength(1)
  })

  it('devuelve vacío cuando la respuesta no es JSON', () => {
    expect(parseQuestions('no puedo generar eso', 'matematicas', 'media', ids())).toEqual([])
  })
})

describe('distribute', () => {
  it('reparte las preguntas entre las áreas por turnos', () => {
    expect(distribute(['matematicas', 'biologia'], 5)).toEqual([
      { area: 'matematicas', count: 3 },
      { area: 'biologia', count: 2 },
    ])
  })

  it('omite las áreas que quedarían sin preguntas', () => {
    expect(distribute(['matematicas', 'biologia', 'fisica'], 2)).toEqual([
      { area: 'matematicas', count: 1 },
      { area: 'biologia', count: 1 },
    ])
  })
})

describe('generateTest', () => {
  const chatWith = (item: Record<string, unknown> = rawItem()) =>
    vi.fn(async (request: ChatRequest) => {
      const asked = /Escribe (\d+) pregunta/.exec(request.messages[1].content)?.[1] ?? '1'
      return JSON.stringify({ preguntas: Array.from({ length: Number(asked) }, () => item) })
    })

  it('hace una llamada por área y respeta el total pedido', async () => {
    const chat = chatWith()

    const questions = await generateTest({
      areas: ['matematicas', 'lectura-critica'],
      difficulty: 'dificil',
      count: 4,
      chat,
      apiKey: 'k',
      model: 'modelo-x',
      makeId: ids(),
    })

    expect(chat).toHaveBeenCalledTimes(2)
    expect(questions).toHaveLength(4)
    expect(questions.filter((entry) => entry.area === 'matematicas')).toHaveLength(2)
    expect(questions.every((entry) => entry.difficulty === 'dificil')).toBe(true)
  })

  it('le pasa al modelo el área y la dificultad pedidas', async () => {
    const chat = chatWith()

    await generateTest({
      areas: ['sociales-ciudadanas'],
      difficulty: 'facil',
      count: 1,
      chat,
      apiKey: 'k',
      model: 'modelo-x',
      makeId: ids(),
    })

    const [request] = chat.mock.calls[0]
    expect(request.messages[0].content).toContain('Sociales y ciudadanas')
    expect(request.messages[0].content).toContain('nivel 1-2')
    expect(request.messages[1].content).toContain('Fácil')
  })

  it('le manda los enunciados previos para que no los repita', async () => {
    const chat = chatWith()

    await generateTest({
      areas: ['matematicas', 'biologia'],
      difficulty: 'media',
      count: 2,
      chat,
      apiKey: 'k',
      model: 'modelo-x',
      makeId: ids(),
    })

    expect(chat.mock.calls[1][0].messages[1].content).toContain('No repitas estos enunciados')
  })

  it('emite cada lote apenas llega', async () => {
    const batches: number[] = []

    await generateTest({
      areas: ['matematicas', 'biologia'],
      difficulty: 'media',
      count: 3,
      chat: chatWith(),
      apiKey: 'k',
      model: 'modelo-x',
      makeId: ids(),
      onQuestions: (batch) => batches.push(batch.length),
    })

    expect(batches).toEqual([2, 1])
  })

  it('falla cuando ninguna pregunta es usable', async () => {
    await expect(
      generateTest({
        areas: ['matematicas'],
        difficulty: 'media',
        count: 1,
        chat: async () => 'lo siento',
        apiKey: 'k',
        model: 'modelo-x',
        makeId: ids(),
      }),
    ).rejects.toThrow(/no devolvió preguntas usables/)
  })

  it('exige al menos un área', async () => {
    await expect(
      generateTest({
        areas: [],
        difficulty: 'media',
        count: 1,
        chat: chatWith(),
        apiKey: 'k',
        model: 'modelo-x',
        makeId: ids(),
      }),
    ).rejects.toThrow(/al menos un área/)
  })
})

describe('explainQuestion', () => {
  const explanation = JSON.stringify({
    pasos: ['Me dicen 12 km en 30 min → sé que rapidez es distancia sobre tiempo → entonces divido'],
    idea_clave: 'v = d / t',
    por_que_falla: 'Multiplicaste en vez de dividir.',
    para_recordar: 'Pasa los minutos a horas antes de dividir.',
  })

  it('devuelve la cadena de pensamiento y dice qué opción falló', async () => {
    const chat = vi.fn(async (_request: ChatRequest) => explanation)

    const result = await explainQuestion({
      question: question(),
      chosen: 'B',
      chat,
      apiKey: 'k',
      model: 'modelo-x',
    })

    expect(result.steps[0]).toContain('→')
    expect(result.keyIdea).toBe('v = d / t')
    expect(result.whyWrong).toContain('Multiplicaste')
    expect(chat.mock.calls[0][0].messages[1].content).toContain('respondió B y falló')
  })

  it('le avisa al modelo cuando el estudiante acertó', async () => {
    const chat = vi.fn(async (_request: ChatRequest) => explanation)

    await explainQuestion({ question: question(), chosen: 'A', chat, apiKey: 'k', model: 'modelo-x' })

    expect(chat.mock.calls[0][0].messages[1].content).toContain('respondió A y acertó')
  })

  it('trata la pregunta sin responder como camino completo', async () => {
    const chat = vi.fn(async (_request: ChatRequest) => explanation)

    await explainQuestion({ question: question(), chosen: null, chat, apiKey: 'k', model: 'modelo-x' })

    expect(chat.mock.calls[0][0].messages[1].content).toContain('no respondió')
  })

  it('conserva el texto crudo cuando el modelo no devuelve JSON', async () => {
    const result = await explainQuestion({
      question: question(),
      chosen: 'A',
      chat: async () => 'Primero divide 12 entre 0.5.',
      apiKey: 'k',
      model: 'modelo-x',
    })

    expect(result.steps).toEqual([])
    expect(result.takeaway).toContain('divide 12')
  })
})

describe('scoreTest', () => {
  it('cuenta respondidas, correctas y porcentaje sobre el test completo', () => {
    const questions = [question({ id: 'a' }), question({ id: 'b' }), question({ id: 'c' })]
    const answers: Record<string, OptionId> = { a: 'A', b: 'C' }

    expect(scoreTest(questions, answers)).toEqual({
      answered: 2,
      correct: 1,
      total: 3,
      percentage: 33,
    })
  })

  it('no divide por cero sin preguntas', () => {
    expect(scoreTest([], {}).percentage).toBe(0)
  })
})

describe('preferencias de práctica', () => {
  it('descarta áreas desconocidas y cae en las de por defecto', () => {
    const parsed = parseIcfesSettings(JSON.stringify({ areas: ['ingles'], difficulty: 'media', count: 5 }))

    expect(parsed?.areas).toEqual(defaultIcfesSettings().areas)
  })

  it('no ofrece inglés como área', () => {
    expect(AREAS.some((area) => /ingl[eé]s/i.test(area.label))).toBe(false)
  })

  it('acota la cantidad de preguntas al rango permitido', () => {
    expect(parseIcfesSettings(JSON.stringify({ count: 99 }))?.count).toBe(20)
    expect(parseIcfesSettings(JSON.stringify({ count: 0 }))?.count).toBe(1)
  })

  it('ignora un JSON corrupto', () => {
    expect(parseIcfesSettings('{no json')).toBeNull()
  })
})
